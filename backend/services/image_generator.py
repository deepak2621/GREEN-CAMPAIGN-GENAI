"""
FLUX.2 Klein 4B Q4_K_M Image Generation Service for Green Campaign AI.
Integrates local ComfyUI workflow utilizing Black Forest Labs' FLUX.2 Klein 4B (Distilled).
Quantization: Q4_K_M GGUF (moonbox-dev/FLUX.2-klein-4B-GGUF) + Qwen3-4B (qwen_3_4b.safetensors) + FLUX.2 VAE.
Optimized for NVIDIA GPU (6-8 GB VRAM) with 16 GB System RAM on Windows.
Features:
- Single ComfyUI process & single generation execution lock (no duplicate loads or concurrent OOM).
- Real-time WebSocket step progress, model load timing, and cancellation support.
- Real hardware telemetry via nvidia-smi, psutil, and ComfyUI /system_stats.
- CUDA OOM detection and VRAM recovery without deleting models or user images.
"""

import os
import io
import time
import uuid
import random
import json
import asyncio
import logging
import threading
import subprocess
import urllib.parse
from pathlib import Path
import aiohttp
import psutil
import requests
from PIL import Image

from backend.config import Config
from backend.services.model_config import Flux2KleinConfig

logger = logging.getLogger("green_campaign_ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class GenerationError(Exception):
    """Base exception for image generation failures."""


class ConfigurationError(Exception):
    """Raised when required model files or configuration are missing."""


class RateLimitError(GenerationError):
    """Retained for backward compatibility with route error handlers."""
    def __init__(self, message: str, retry_after: int = 0):
        super().__init__(message)
        self.retry_after = retry_after


class ServiceBusyError(GenerationError):
    """Raised when a generation request is already queued or running."""


class ModelNotReadyError(GenerationError):
    """Raised when the local ComfyUI server is still booting or unresponsive."""


class CudaOOMError(GenerationError):
    """Raised when GPU VRAM is exhausted during diffusion inference."""


class CancelledGenerationError(GenerationError):
    """Raised when a user cancels an active generation job."""


class ComfyUIProcessManager:
    """Thread-safe singleton manager for the local ComfyUI server lifecycle."""
    _process = None
    _log_handle = None
    _lock = threading.Lock()

    @classmethod
    def is_running(cls) -> bool:
        """Checks whether the ComfyUI HTTP server is responsive."""
        try:
            res = requests.get(f"{Flux2KleinConfig.COMFY_URL}/system_stats", timeout=3)
            return res.status_code == 200
        except Exception:
            return False

    @classmethod
    def terminate_server(cls) -> None:
        """Terminates any managed or stale ComfyUI server holding COMFY_PORT."""
        if cls._process is not None:
            try:
                if cls._process.poll() is None:
                    cls._process.terminate()
                    cls._process.wait(timeout=5)
            except Exception:
                try:
                    cls._process.kill()
                except Exception:
                    pass
            cls._process = None

        port_str = str(Flux2KleinConfig.COMFY_PORT)
        try:
            for proc in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    cmd = proc.info.get("cmdline") or []
                    joined = " ".join(str(x) for x in cmd)
                    if "main.py" in joined and port_str in joined and "ComfyUI" in joined:
                        logger.warning("Terminating stale/unhealthy ComfyUI PID %s on port %s", proc.info["pid"], port_str)
                        proc.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception:
            pass

    @classmethod
    def ensure_server(cls) -> bool:
        """Launches a single ComfyUI server instance if not already active."""
        if cls.is_running():
            return True

        with cls._lock:
            if cls.is_running():
                return True

            # Clean up any zombie/CUDA-crashed ComfyUI still holding port 8188
            cls.terminate_server()

            comfy_dir = Flux2KleinConfig.COMFY_DIR
            main_py = comfy_dir / "main.py"
            if not main_py.exists():
                raise ConfigurationError(
                    f"ComfyUI installation not found at '{comfy_dir}'. "
                    "Please verify COMFY_DIR in backend/.env."
                )

            logger.info(
                "Launching local ComfyUI server for FLUX.2 Klein 4B Q4_K_M "
                "(CPU text-encoder offload --lowvram, FP8 TE, PyTorch SDPA, 1.0GB VRAM reserve, fast-disk)..."
            )
            cmd = [
                "python",
                str(main_py),
                "--listen", Flux2KleinConfig.COMFY_HOST,
                "--port", str(Flux2KleinConfig.COMFY_PORT),
                "--disable-auto-launch",
                "--lowvram",
                "--fp8_e4m3fn-text-enc",
                "--use-pytorch-cross-attention",
                "--reserve-vram", "1.0",
                "--fast-disk",
            ]

            log_dir = Path(Config.GENERATED_IMAGES_DIR).parent / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            log_path = log_dir / "comfyui_server.log"
            if cls._log_handle is not None:
                try:
                    cls._log_handle.close()
                except Exception:
                    pass
                cls._log_handle = None
            cls._log_handle = open(log_path, "a", encoding="utf-8", buffering=1)

            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["TQDM_DISABLE"] = "1"

            creationflags = (
                (subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP)
                if os.name == "nt"
                else 0
            )
            cls._process = subprocess.Popen(
                cmd,
                cwd=str(comfy_dir),
                stdin=subprocess.DEVNULL,
                stdout=cls._log_handle,
                stderr=cls._log_handle,
                env=env,
                close_fds=True,
                creationflags=creationflags,
            )

            for _ in range(45):
                time.sleep(1)
                if cls.is_running():
                    logger.info("Local ComfyUI server online on port %d", Flux2KleinConfig.COMFY_PORT)
                    return True

            raise ModelNotReadyError(
                "Local ComfyUI server started but did not respond within 45 seconds."
            )

    @classmethod
    def ensure_running(cls) -> bool:
        return cls.ensure_server()


class SystemMonitor:
    """Collects real GPU, VRAM, System RAM, and generation performance metrics."""
    last_model_load_sec: float | None = None
    last_generation_sec: float | None = None
    last_preset: str | None = None
    last_resolution: str | None = None
    total_generations: int = 0

    @classmethod
    def record_generation(cls, model_load_sec: float, generation_sec: float, preset: str, resolution: str):
        cls.last_model_load_sec = round(model_load_sec, 2)
        cls.last_generation_sec = round(generation_sec, 2)
        cls.last_preset = preset
        cls.last_resolution = resolution
        cls.total_generations += 1

    @staticmethod
    def query_nvidia_smi() -> dict | None:
        try:
            out = subprocess.check_output(
                [
                    "nvidia-smi",
                    "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu",
                    "--format=csv,noheader,nounits",
                ],
                text=True,
                timeout=3,
            ).strip()
            if not out:
                return None
            first_line = out.splitlines()[0]
            parts = [p.strip() for p in first_line.split(",")]
            if len(parts) >= 4:
                vram_used = int(parts[2])
                vram_total = int(parts[3])
                return {
                    "gpu_name": parts[0],
                    "gpu_utilization_pct": int(parts[1]),
                    "vram_used_mb": vram_used,
                    "vram_total_mb": vram_total,
                    "vram_free_mb": max(0, vram_total - vram_used),
                    "vram_percent": round((vram_used / vram_total) * 100, 1) if vram_total else 0.0,
                    "gpu_temp_c": int(parts[4]) if len(parts) >= 5 and parts[4].isdigit() else None,
                }
        except Exception:
            return None
        return None

    @classmethod
    def get_metrics(cls, active_job: dict | None = None) -> dict:
        vm = psutil.virtual_memory()
        ram_total_gb = round(vm.total / (1024 ** 3), 2)
        ram_used_gb = round(vm.used / (1024 ** 3), 2)
        ram_available_gb = round(vm.available / (1024 ** 3), 2)

        comfy_online = False
        comfy_vram = {}
        queue_running = 0
        queue_pending = 0
        torch_version = None

        try:
            res = requests.get(f"{Flux2KleinConfig.COMFY_URL}/system_stats", timeout=2)
            if res.status_code == 200:
                comfy_online = True
                data = res.json()
                torch_version = data.get("system", {}).get("pytorch_version")
                devices = data.get("devices", [])
                if devices:
                    gpu0 = devices[0]
                    tot_mb = int(gpu0.get("vram_total", 0) / (1024 * 1024))
                    free_mb = int(gpu0.get("vram_free", 0) / (1024 * 1024))
                    comfy_vram = {
                        "gpu_name": gpu0.get("name"),
                        "vram_total_mb": tot_mb,
                        "vram_free_mb": free_mb,
                        "vram_used_mb": max(0, tot_mb - free_mb),
                    }
            q_res = requests.get(f"{Flux2KleinConfig.COMFY_URL}/queue", timeout=2)
            if q_res.status_code == 200:
                qd = q_res.json()
                queue_running = len(qd.get("queue_running", []))
                queue_pending = len(qd.get("queue_pending", []))
        except Exception:
            pass

        gpu_smi = cls.query_nvidia_smi()
        gpu_name = (gpu_smi or {}).get("gpu_name") or comfy_vram.get("gpu_name") or "Unavailable"
        vram_total_mb = (gpu_smi or {}).get("vram_total_mb") or comfy_vram.get("vram_total_mb")
        vram_used_mb = (gpu_smi or {}).get("vram_used_mb") if gpu_smi else comfy_vram.get("vram_used_mb")
        vram_free_mb = (gpu_smi or {}).get("vram_free_mb") if gpu_smi else comfy_vram.get("vram_free_mb")
        vram_percent = (
            round((vram_used_mb / vram_total_mb) * 100, 1)
            if vram_used_mb is not None and vram_total_mb
            else None
        )

        return {
            "server_online": comfy_online,
            "gpu_available": gpu_smi is not None or bool(comfy_vram),
            "gpu_name": gpu_name,
            "gpu_utilization_pct": gpu_smi.get("gpu_utilization_pct") if gpu_smi else None,
            "gpu_temp_c": gpu_smi.get("gpu_temp_c") if gpu_smi else None,
            "vram_used_mb": vram_used_mb,
            "vram_free_mb": vram_free_mb,
            "vram_total_mb": vram_total_mb,
            "vram_percent": vram_percent,
            "ram_used_gb": ram_used_gb,
            "ram_available_gb": ram_available_gb,
            "ram_total_gb": ram_total_gb,
            "ram_percent": round(vm.percent, 1),
            "torch_version": torch_version,
            "queue_running": queue_running,
            "queue_pending": queue_pending,
            "last_model_load_sec": cls.last_model_load_sec,
            "last_generation_sec": cls.last_generation_sec,
            "last_preset": cls.last_preset,
            "last_resolution": cls.last_resolution,
            "total_generations": cls.total_generations,
            "generation_status": active_job.get("status") if active_job else ("busy" if queue_running else "idle"),
            "active_job": active_job,
        }


class ImageGeneratorService:
    """
    Primary image generation service powered by FLUX.2 Klein 4B Q4_K_M GGUF via ComfyUI.
    Supports synchronous generation, asynchronous jobs with WebSocket progress,
    cancellation, single-execution queuing, and CUDA OOM recovery.
    """

    def __init__(self):
        self.output_dir = Path(Config.GENERATED_IMAGES_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._gen_lock = threading.Lock()
        self._jobs_lock = threading.Lock()
        self._jobs: dict[str, dict] = {}
        self._active_job_id: str | None = None

    @classmethod
    def get_cooldown_remaining(cls) -> int:
        return 0

    def get_system_metrics(self) -> dict:
        active = None
        with self._jobs_lock:
            if self._active_job_id and self._active_job_id in self._jobs:
                job = self._jobs[self._active_job_id]
                active = {
                    "job_id": job["job_id"],
                    "status": job["status"],
                    "stage": job["stage"],
                    "progress_pct": job["progress_pct"],
                    "step": job["step"],
                    "max_steps": job["max_steps"],
                    "preset": job["preset"],
                }
        return SystemMonitor.get_metrics(active_job=active)

    @staticmethod
    def _build_flux2_klein_workflow(
        prompt: str,
        width: int,
        height: int,
        seed: int,
        steps: int,
        cfg: float,
        sampler: str,
    ) -> dict:
        """
        Constructs the 13-node FLUX.2 Klein 4B Q4_K_M GGUF workflow for ComfyUI:
        1. UnetLoaderGGUF: flux-2-klein-4b-Q4_K_M.gguf
        2. CLIPLoader: qwen_3_4b.safetensors (type="flux2")
        3. VAELoader: flux2-vae.safetensors
        4. CLIPTextEncode: positive prompt
        5. ConditioningZeroOut: zero negative conditioning
        6. CFGGuider: cfg=1.0 for distilled flow matching
        7. EmptyFlux2LatentImage: latent tensor
        8. KSamplerSelect: euler
        9. Flux2Scheduler: distilled schedule
        10. RandomNoise: reproducible seed
        11. SamplerCustomAdvanced: flow-matching sampling
        12. VAEDecode: latent -> image
        13. PreviewImage: temporary ComfyUI output (clean, avoids duplicate output files)
        """
        return {
            "1": {
                "inputs": {"unet_name": Flux2KleinConfig.UNET_NAME},
                "class_type": "UnetLoaderGGUF",
                "_meta": {"title": "FLUX.2 Klein 4B Q4_K_M UNet (GGUF)"},
            },
            "2": {
                "inputs": {
                    "clip_name": Flux2KleinConfig.CLIP_NAME,
                    "type": "flux2",
                },
                "class_type": "CLIPLoader",
                "_meta": {"title": "Qwen3-4B Text Encoder (FLUX.2)"},
            },
            "3": {
                "inputs": {"vae_name": Flux2KleinConfig.VAE_NAME},
                "class_type": "VAELoader",
                "_meta": {"title": "FLUX.2 VAE"},
            },
            "4": {
                "inputs": {"text": prompt, "clip": ["2", 0]},
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Positive Prompt"},
            },
            "5": {
                "inputs": {"conditioning": ["4", 0]},
                "class_type": "ConditioningZeroOut",
                "_meta": {"title": "Zero Negative Conditioning"},
            },
            "6": {
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["4", 0],
                    "negative": ["5", 0],
                    "cfg": float(cfg),
                },
                "class_type": "CFGGuider",
                "_meta": {"title": f"CFGGuider ({cfg})"},
            },
            "7": {
                "inputs": {"width": width, "height": height, "batch_size": Flux2KleinConfig.BATCH_SIZE},
                "class_type": "EmptyFlux2LatentImage",
                "_meta": {"title": f"Empty FLUX.2 Latent ({width}x{height})"},
            },
            "8": {
                "inputs": {"sampler_name": sampler},
                "class_type": "KSamplerSelect",
                "_meta": {"title": f"KSamplerSelect ({sampler})"},
            },
            "9": {
                "inputs": {
                    "steps": int(steps),
                    "width": width,
                    "height": height,
                },
                "class_type": "Flux2Scheduler",
                "_meta": {"title": f"Flux2Scheduler ({steps} steps)"},
            },
            "10": {
                "inputs": {"noise_seed": int(seed)},
                "class_type": "RandomNoise",
                "_meta": {"title": "RandomNoise"},
            },
            "11": {
                "inputs": {
                    "noise": ["10", 0],
                    "guider": ["6", 0],
                    "sampler": ["8", 0],
                    "sigmas": ["9", 0],
                    "latent_image": ["7", 0],
                },
                "class_type": "SamplerCustomAdvanced",
                "_meta": {"title": "SamplerCustomAdvanced"},
            },
            "12": {
                "inputs": {"samples": ["11", 0], "vae": ["3", 0]},
                "class_type": "VAEDecode",
                "_meta": {"title": "VAE Decode"},
            },
            "13": {
                "inputs": {"images": ["12", 0]},
                "class_type": "PreviewImage",
                "_meta": {"title": "PreviewImage Output"},
            },
        }

    def _validate_request_and_hardware(self, prompt_data: dict) -> tuple[str, dict, int, dict]:
        if not Flux2KleinConfig.is_checkpoint_available():
            raise ConfigurationError(
                "FLUX.2 Klein files not found in ComfyUI models directory. "
                f"UNet({Flux2KleinConfig.UNET_NAME}): {Flux2KleinConfig.UNET_PATH.exists()}, "
                f"CLIP({Flux2KleinConfig.CLIP_NAME}): {Flux2KleinConfig.CLIP_PATH.exists()}, "
                f"VAE({Flux2KleinConfig.VAE_NAME}): {Flux2KleinConfig.VAE_PATH.exists()}."
            )

        prompt = (prompt_data.get("prompt") or "").strip()
        if not prompt:
            raise GenerationError("Cannot generate image with an empty prompt.")

        preset_id = (prompt_data.get("preset") or Flux2KleinConfig.DEFAULT_PRESET).strip().lower()
        preset = Flux2KleinConfig.get_preset(preset_id)

        dimensions = prompt_data.get("dimensions") or Flux2KleinConfig.get_dimensions(
            aspect_ratio=prompt_data.get("aspect_ratio", "1:1"),
            preset_id=preset["id"],
        )
        width = max(256, min(1024, (int(dimensions.get("width", 512)) // 16) * 16))
        height = max(256, min(1024, (int(dimensions.get("height", 512)) // 16) * 16))

        raw_seed = prompt_data.get("seed")
        if raw_seed is None or str(raw_seed).strip() == "" or not str(raw_seed).strip().isdigit():
            seed = random.randint(100000, 99999999)
        else:
            seed = max(0, min(2 ** 32 - 1, int(str(raw_seed).strip())))

        smi = SystemMonitor.query_nvidia_smi()
        if smi and smi["vram_total_mb"] > 0 and smi["vram_free_mb"] < 900:
            self._free_comfy_memory()

        return prompt, {"width": width, "height": height}, seed, preset

    @staticmethod
    def _free_comfy_memory():
        try:
            requests.post(
                f"{Flux2KleinConfig.COMFY_URL}/free",
                json={"unload_models": True, "free_memory": True},
                timeout=5,
            )
        except Exception:
            pass

    def _update_job(self, job_id: str | None, **fields):
        if not job_id:
            return
        with self._jobs_lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(fields)
                self._jobs[job_id]["updated_at"] = time.time()

    def _prune_old_jobs(self):
        with self._jobs_lock:
            if len(self._jobs) <= 40:
                return
            done_ids = [
                jid for jid, j in sorted(self._jobs.items(), key=lambda x: x[1]["created_at"])
                if j["status"] in ("completed", "error", "cancelled")
            ]
            for jid in done_ids[:-25]:
                self._jobs.pop(jid, None)

    def start_job(self, prompt_data: dict, metadata: dict | None = None, user_id: str | None = None) -> dict:
        """
        Starts an asynchronous FLUX.2 Klein 4B Q4 generation job and returns immediately with job status.
        """
        prompt, dims, seed, preset = self._validate_request_and_hardware(prompt_data)

        with self._jobs_lock:
            for existing in self._jobs.values():
                if (
                    user_id
                    and existing.get("user_id") == user_id
                    and existing["status"] in ("queued", "loading_model", "encoding", "sampling", "decoding")
                ):
                    raise ServiceBusyError(
                        "A campaign visual generation is already in progress. Please wait for it to finish or cancel it first."
                    )

            job_id = uuid.uuid4().hex[:12]
            job_record = {
                "job_id": job_id,
                "user_id": user_id,
                "status": "queued",
                "stage": "Waiting in queue...",
                "progress_pct": 0.0,
                "step": 0,
                "max_steps": preset["steps"],
                "preset": preset["id"],
                "preset_label": preset["label"],
                "width": dims["width"],
                "height": dims["height"],
                "seed": seed,
                "prompt": prompt,
                "prompt_id": None,
                "cancel_requested": False,
                "model_load_time_sec": 0.0,
                "generation_time_sec": 0.0,
                "error": None,
                "error_type": None,
                "result": None,
                "metadata": metadata or {},
                "created_at": time.time(),
                "updated_at": time.time(),
            }
            self._jobs[job_id] = job_record

        self._prune_old_jobs()

        thread = threading.Thread(
            target=self._run_job_thread,
            args=(job_id, prompt_data, prompt, dims, seed, preset),
            daemon=True,
        )
        thread.start()
        return self.get_job(job_id)

    def get_job(self, job_id: str) -> dict | None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            copy = dict(job)
            if copy["status"] in ("queued", "loading_model", "encoding", "sampling", "decoding"):
                copy["elapsed_sec"] = round(time.time() - copy["created_at"], 1)
            else:
                copy["elapsed_sec"] = copy["generation_time_sec"]
            return copy

    def cancel_job(self, job_id: str, user_id: str | None = None) -> tuple[bool, str]:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if not job:
                return False, "Generation job not found."
            if user_id and job.get("user_id") and job["user_id"] != user_id:
                return False, "You do not have permission to cancel this job."
            if job["status"] in ("completed", "error", "cancelled"):
                return False, f"Job is already {job['status']}."
            job["cancel_requested"] = True
            prompt_id = job.get("prompt_id")

        try:
            if prompt_id:
                requests.post(f"{Flux2KleinConfig.COMFY_URL}/queue", json={"delete": [prompt_id]}, timeout=3)
            requests.post(f"{Flux2KleinConfig.COMFY_URL}/interrupt", timeout=3)
        except Exception:
            pass

        self._update_job(
            job_id,
            status="cancelled",
            stage="Generation cancelled by user.",
            error="Generation was cancelled.",
            error_type="CancelledGenerationError",
        )
        return True, "Generation cancelled."

    def _run_job_thread(self, job_id: str, prompt_data: dict, prompt: str, dims: dict, seed: int, preset: dict):
        try:
            if not ComfyUIProcessManager.is_running():
                self._update_job(
                    job_id,
                    status="loading_model",
                    stage="Starting local ComfyUI inference engine...",
                    progress_pct=1.0,
                )
            ComfyUIProcessManager.ensure_server()
            result = self._execute_pipeline(prompt_data, prompt, dims, seed, preset, job_id=job_id)
            job_snapshot = self.get_job(job_id)
            if job_snapshot and job_snapshot.get("cancel_requested"):
                return
            meta = (job_snapshot or {}).get("metadata") or {}
            payload = {
                **meta,
                "generated_prompt": prompt,
                "negative_prompt": prompt_data.get("negative_prompt", ""),
                "seed": result["seed"],
                "model": result["model"],
                "developer": Flux2KleinConfig.DEVELOPER,
                "architecture": Flux2KleinConfig.ARCHITECTURE,
                "quantization": result["quantization"],
                "license": result["license"],
                "preset": result["preset"],
                "preset_label": result["preset_label"],
                "steps": result["steps"],
                "guidance_scale": result["guidance_scale"],
                "cfg_scale": result["cfg_scale"],
                "sampler": result["sampler"],
                "scheduler": result["scheduler"],
                "model_load_time_sec": result["model_load_time_sec"],
                "generation_time_sec": result["generation_time_sec"],
                "image_url": f"/api/images/{result['filename']}",
                "download_url": f"/api/images/{result['filename']}/download",
                "filename": result["filename"],
                "file_path": result["file_path"],
                "width": result["width"],
                "height": result["height"],
                "file_size": result["file_size"],
            }
            self._update_job(
                job_id,
                status="completed",
                stage="Completed! Image ready.",
                progress_pct=100.0,
                step=preset["steps"],
                model_load_time_sec=result["model_load_time_sec"],
                generation_time_sec=result["generation_time_sec"],
                result=payload,
            )
        except CancelledGenerationError:
            self._update_job(
                job_id,
                status="cancelled",
                stage="Generation cancelled.",
                error="Generation was cancelled by user.",
                error_type="CancelledGenerationError",
                error_code="CANCELLED",
            )
        except CudaOOMError as e:
            self._update_job(
                job_id,
                status="error",
                stage="GPU memory limit reached",
                error=str(e),
                error_type="CudaOOMError",
                error_code="GPU_MEMORY_EXHAUSTED",
            )
        except ConfigurationError as e:
            self._update_job(
                job_id,
                status="error",
                stage="Configuration error",
                error=str(e),
                error_type="ConfigurationError",
                error_code="MODEL_CONFIGURATION_ERROR",
            )
        except ModelNotReadyError as e:
            self._update_job(
                job_id,
                status="error",
                stage="Image-generation engine unavailable",
                error=str(e),
                error_type="ModelNotReadyError",
                error_code="MODEL_UNAVAILABLE",
            )
        except Exception as e:
            logger.exception("Async generation job %s failed", job_id)
            err_msg = str(e)
            err_code = "GENERATION_TIMEOUT" if "timed out" in err_msg.lower() else "GENERATION_FAILED"
            self._update_job(
                job_id,
                status="error",
                stage="Generation failed",
                error=err_msg,
                error_type="GenerationError",
                error_code=err_code,
            )

    def generate(self, prompt_data: dict) -> dict:
        """Synchronous generation entry point used by /api/generate and automated tests."""
        prompt, dims, seed, preset = self._validate_request_and_hardware(prompt_data)
        ComfyUIProcessManager.ensure_server()
        return self._execute_pipeline(prompt_data, prompt, dims, seed, preset, job_id=None)

    def _execute_pipeline(
        self,
        prompt_data: dict,
        prompt: str,
        dims: dict,
        seed: int,
        preset: dict,
        job_id: str | None = None,
    ) -> dict:
        width = dims["width"]
        height = dims["height"]
        steps = preset["steps"]
        cfg = preset["cfg"]
        guidance = preset["guidance"]
        sampler = preset["sampler"]
        scheduler = preset["scheduler"]

        with self._gen_lock:
            if job_id:
                with self._jobs_lock:
                    self._active_job_id = job_id
                    if self._jobs.get(job_id, {}).get("cancel_requested"):
                        raise CancelledGenerationError("Cancelled before dispatch.")

            try:
                start_time = time.time()
                client_id = f"green_ai_{uuid.uuid4().hex[:8]}"

                logger.info("=" * 80)
                logger.info("FLUX.2 KLEIN 4B Q4_K_M GENERATION DISPATCH (%s)", preset["label"].upper())
                logger.info(
                    "Model: %s | Resolution: %dx%d | Seed: %d | Steps: %d | CFG: %.1f | %s/%s",
                    Flux2KleinConfig.MODEL_NAME, width, height, seed, steps, cfg, sampler, scheduler,
                )
                logger.info("PROMPT: %s", prompt)
                logger.info("=" * 80)

                workflow = self._build_flux2_klein_workflow(
                    prompt=prompt,
                    width=width,
                    height=height,
                    seed=seed,
                    steps=steps,
                    cfg=cfg,
                    sampler=sampler,
                )

                image_bytes, model_load_sec = asyncio.run(
                    self._dispatch_and_stream(
                        workflow=workflow,
                        client_id=client_id,
                        steps=steps,
                        job_id=job_id,
                        timeout=300,
                    )
                )

                self._update_job(job_id, status="decoding", stage="Optimizing PNG output...", progress_pct=98.0)
                saved_info = self._process_and_save(image_bytes)
                duration_sec = round(time.time() - start_time, 2)

                SystemMonitor.record_generation(
                    model_load_sec=model_load_sec,
                    generation_sec=duration_sec,
                    preset=preset["id"],
                    resolution=f"{width}x{height}",
                )

                logger.info(
                    "Generation succeeded in %.2fs (model load: %.2fs) -> %s",
                    duration_sec, model_load_sec, saved_info["filename"],
                )

                saved_info.update({
                    "seed": seed,
                    "model": Flux2KleinConfig.MODEL_NAME,
                    "developer": Flux2KleinConfig.DEVELOPER,
                    "architecture": Flux2KleinConfig.ARCHITECTURE,
                    "provider": Flux2KleinConfig.PROVIDER,
                    "preset": preset["id"],
                    "preset_label": preset["label"],
                    "steps": steps,
                    "guidance_scale": guidance,
                    "cfg_scale": cfg,
                    "sampler": sampler,
                    "scheduler": scheduler,
                    "model_load_time_sec": round(model_load_sec, 2),
                    "generation_time_sec": duration_sec,
                    "license": Flux2KleinConfig.LICENSE,
                    "quantization": Flux2KleinConfig.QUANTIZATION,
                    "execution": Flux2KleinConfig.EXECUTION_PROFILE,
                })
                return saved_info
            finally:
                if job_id:
                    with self._jobs_lock:
                        if self._active_job_id == job_id:
                            self._active_job_id = None

    async def _dispatch_and_stream(
        self,
        workflow: dict,
        client_id: str,
        steps: int,
        job_id: str | None = None,
        timeout: int = 300,
    ) -> tuple[bytes, float]:
        """Connects to ComfyUI WebSocket, submits workflow, streams real progress, and fetches output bytes."""
        ws_url = f"{Flux2KleinConfig.COMFY_WS_URL}?clientId={client_id}"
        http_timeout = aiohttp.ClientTimeout(total=30)

        load_start: float | None = None
        model_load_sec = 0.0
        prompt_id: str | None = None
        start_wall = time.time()

        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url, heartbeat=15) as ws:
                self._update_job(job_id, status="loading_model", stage="Submitting workflow to ComfyUI...", progress_pct=2.0)

                async with session.post(
                    f"{Flux2KleinConfig.COMFY_URL}/prompt",
                    json={"prompt": workflow, "client_id": client_id},
                    timeout=http_timeout,
                ) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        if "out of memory" in err_text.lower():
                            self._free_comfy_memory()
                            raise CudaOOMError(
                                "GPU VRAM exhausted before sampling. Try Fast Mode (512x512) or close GPU-heavy apps."
                            )
                        raise GenerationError(f"ComfyUI rejected workflow ({resp.status}): {err_text}")
                    qdata = await resp.json()
                    prompt_id = qdata.get("prompt_id")
                    if not prompt_id:
                        raise GenerationError("ComfyUI did not return a valid prompt ID.")

                self._update_job(job_id, prompt_id=prompt_id, status="loading_model", stage="Preparing FLUX.2 Klein 4B model...", progress_pct=5.0)
                last_health_check = time.time()

                while time.time() - start_wall < timeout:
                    if job_id:
                        with self._jobs_lock:
                            if self._jobs.get(job_id, {}).get("cancel_requested"):
                                raise CancelledGenerationError("Cancelled during generation.")

                    try:
                        msg = await asyncio.wait_for(ws.receive(), timeout=1.0)
                    except asyncio.TimeoutError:
                        done, out_bytes = await self._check_history_async(session, prompt_id)
                        if done:
                            return out_bytes, model_load_sec
                        if time.time() - last_health_check >= 8.0:
                            last_health_check = time.time()
                            try:
                                async with session.get(f"{Flux2KleinConfig.COMFY_URL}/system_stats", timeout=aiohttp.ClientTimeout(total=4)) as h_res:
                                    if h_res.status >= 500:
                                        ComfyUIProcessManager.terminate_server()
                                        raise CudaOOMError(
                                            "ComfyUI GPU worker encountered a CUDA Out-of-Memory state and was reset. "
                                            "Please retry in Fast Mode (512x512)."
                                        )
                            except (aiohttp.ClientError, asyncio.TimeoutError):
                                pass
                        continue

                    if msg.type == aiohttp.WSMsgType.TEXT:
                        payload = json.loads(msg.data)
                        msg_type = payload.get("type")
                        data = payload.get("data") or {}

                        if data.get("prompt_id") and data.get("prompt_id") != prompt_id:
                            continue

                        if msg_type == "executing":
                            node = data.get("node")
                            if node is None:
                                break
                            if node in ("1", "2", "3"):
                                if load_start is None:
                                    load_start = time.time()
                                self._update_job(
                                    job_id,
                                    status="loading_model",
                                    stage="Loading FLUX.2 Klein 4B Q4 & Qwen3-4B into GPU/RAM...",
                                    progress_pct=6.0,
                                )
                            elif node in ("4", "5", "6", "7", "8", "9", "10"):
                                if load_start is not None and model_load_sec == 0.0:
                                    model_load_sec = time.time() - load_start
                                self._update_job(
                                    job_id,
                                    status="encoding",
                                    stage="Encoding campaign prompt with Qwen3-4B...",
                                    progress_pct=10.0,
                                    model_load_time_sec=round(model_load_sec, 2),
                                )
                            elif node == "11":
                                if load_start is not None and model_load_sec == 0.0:
                                    model_load_sec = time.time() - load_start
                                self._update_job(
                                    job_id,
                                    status="sampling",
                                    stage=f"Sampling FLUX.2 Klein 4B (0/{steps} steps)...",
                                    progress_pct=12.0,
                                    model_load_time_sec=round(model_load_sec, 2),
                                )
                            elif node in ("12", "13"):
                                self._update_job(
                                    job_id,
                                    status="decoding",
                                    stage="Decoding latent image with FLUX.2 VAE...",
                                    progress_pct=96.0,
                                    step=steps,
                                )

                        elif msg_type == "progress":
                            val = int(data.get("value", 0))
                            mx = max(1, int(data.get("max", steps)))
                            pct = round(12.0 + (val / mx) * 82.0, 1)
                            self._update_job(
                                job_id,
                                status="sampling",
                                stage=f"Sampling FLUX.2 Klein 4B ({val}/{mx} steps)...",
                                progress_pct=pct,
                                step=val,
                                max_steps=mx,
                            )

                        elif msg_type == "execution_interrupted":
                            raise CancelledGenerationError("ComfyUI execution interrupted.")

                        elif msg_type == "execution_error":
                            exc_msg = data.get("exception_message") or "ComfyUI execution error"
                            if "out of memory" in exc_msg.lower():
                                self._free_comfy_memory()
                                raise CudaOOMError(
                                    "CUDA Out of Memory during FLUX.2 Klein 4B inference. "
                                    "Switch to Fast Mode (512x512) or close other GPU applications and retry."
                                )
                            if "errno 22" in exc_msg.lower() or "invalid argument" in exc_msg.lower():
                                raise GenerationError(
                                    "ComfyUI execution failed due to a broken console/stderr handle ([Errno 22]). "
                                    "Restart the ComfyUI server (or restart Flask so it auto-launches ComfyUI cleanly) and retry."
                                )
                            raise GenerationError(f"ComfyUI execution failed: {exc_msg}")

                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        break

                for _ in range(15):
                    done, out_bytes = await self._check_history_async(session, prompt_id)
                    if done:
                        return out_bytes, model_load_sec
                    await asyncio.sleep(0.4)

        raise GenerationError(f"FLUX.2 Klein 4B generation timed out after {timeout} seconds.")

    async def _check_history_async(self, session: aiohttp.ClientSession, prompt_id: str) -> tuple[bool, bytes]:
        async with session.get(f"{Flux2KleinConfig.COMFY_URL}/history/{prompt_id}", timeout=aiohttp.ClientTimeout(total=10)) as res:
            if res.status != 200:
                return False, b""
            history = await res.json()
            if prompt_id not in history:
                return False, b""
            item = history[prompt_id]
            status = item.get("status", {})
            if status.get("status_str") == "error":
                messages = status.get("messages", [])
                err_msg = str(messages[0]) if messages else "Execution error in ComfyUI"
                if "out of memory" in err_msg.lower():
                    self._free_comfy_memory()
                    raise CudaOOMError(
                        "CUDA Out of Memory during FLUX.2 Klein 4B inference. "
                        "Try Fast Mode (512x512) or free GPU memory and retry."
                    )
                if "errno 22" in err_msg.lower() or "invalid argument" in err_msg.lower():
                    raise GenerationError(
                        "ComfyUI execution failed due to a broken console/stderr handle ([Errno 22]). "
                        "Restart the ComfyUI server (or restart Flask so it auto-launches ComfyUI cleanly) and retry."
                    )
                raise GenerationError(f"ComfyUI execution failed: {err_msg}")

            outputs = item.get("outputs", {})
            save_node = outputs.get("13") or next((v for v in outputs.values() if "images" in v), {})
            images = save_node.get("images", [])
            if not images:
                return False, b""

            img_meta = images[0]
            url = (
                f"{Flux2KleinConfig.COMFY_URL}/view"
                f"?filename={urllib.parse.quote(img_meta['filename'])}"
                f"&subfolder={urllib.parse.quote(img_meta.get('subfolder', ''))}"
                f"&type={urllib.parse.quote(img_meta.get('type', 'temp'))}"
            )
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as img_res:
                if img_res.status == 200:
                    data = await img_res.read()
                    if data:
                        return True, data
            raise GenerationError("Failed to fetch generated image data from ComfyUI.")

    def _process_and_save(self, image_bytes: bytes) -> dict:
        """Validates and persists image as lossless PNG with Pillow and verifies disk output."""
        if not image_bytes:
            raise GenerationError("Image generation returned empty image bytes.")

        self.output_dir.mkdir(parents=True, exist_ok=True)
        unique_id = uuid.uuid4().hex[:12]
        timestamp = int(time.time())
        filename = f"campaign_{unique_id}_{timestamp}.png"
        file_path = self.output_dir / filename

        try:
            with Image.open(io.BytesIO(image_bytes)) as image:
                rgb_image = image.convert("RGB") if image.mode not in ("RGB", "RGBA") else image
                rgb_image.save(file_path, format="PNG", optimize=True)
                width, height = rgb_image.width, rgb_image.height

            if not file_path.is_file():
                raise GenerationError("Generated image file was not created on disk.")

            file_size = os.path.getsize(file_path)
            if file_size <= 0:
                raise GenerationError("Generated image file on disk is empty.")

            with Image.open(file_path) as saved_check:
                saved_check.verify()

            return {
                "filename": filename,
                "file_path": str(file_path),
                "filepath": str(file_path),
                "width": width,
                "height": height,
                "file_size": file_size,
            }
        except GenerationError:
            raise
        except Exception as e:
            logger.exception("Failed saving or verifying generated PNG '%s'", file_path)
            raise GenerationError(f"Failed saving generated image: {str(e)}")


image_generator_service = ImageGeneratorService()
image_generator = image_generator_service
