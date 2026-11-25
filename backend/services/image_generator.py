"""
FLUX.1 Dev Q4 GGUF Image Generation Service for Green Campaign AI.
Integrates local ComfyUI workflow utilizing Black Forest Labs' FLUX.1 Dev (12B).
Quantization: Q4_K_S GGUF (city96/FLUX.1-dev-gguf) + T5-XXL Q4_K_M GGUF + CLIP-L + FLUX VAE.
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
from backend.services.model_config import Flux1DevConfig

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
    _lock = threading.Lock()

    @classmethod
    def is_running(cls) -> bool:
        """Checks whether the ComfyUI HTTP server is responsive."""
        try:
            res = requests.get(f"{Flux1DevConfig.COMFY_URL}/system_stats", timeout=3)
            return res.status_code == 200
        except Exception:
            return False

    @classmethod
    def ensure_server(cls) -> bool:
        """Launches a single ComfyUI server instance if not already active."""
        if cls.is_running():
            return True

        with cls._lock:
            if cls.is_running():
                return True

            comfy_dir = Flux1DevConfig.COMFY_DIR
            main_py = comfy_dir / "main.py"
            if not main_py.exists():
                raise ConfigurationError(
                    f"ComfyUI installation not found at '{comfy_dir}'. "
                    "Please verify COMFY_DIR in backend/.env."
                )

            logger.info(
                "Launching local ComfyUI server for FLUX.1 Dev Q4 GGUF "
                "(PyTorch SDPA, FP8 text encoder, 0.6GB VRAM reserve, smart LRU cache)..."
            )
            cmd = [
                "python",
                str(main_py),
                "--listen", Flux1DevConfig.COMFY_HOST,
                "--port", str(Flux1DevConfig.COMFY_PORT),
                "--disable-auto-launch",
                "--fp8_e4m3fn-text-enc",
                "--use-pytorch-cross-attention",
                "--reserve-vram", "0.6",
                "--fast-disk",
            ]

            creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            cls._process = subprocess.Popen(
                cmd,
                cwd=str(comfy_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=creationflags,
            )

            for _ in range(45):
                time.sleep(1)
                if cls.is_running():
                    logger.info("Local ComfyUI server online on port %d", Flux1DevConfig.COMFY_PORT)
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
            res = requests.get(f"{Flux1DevConfig.COMFY_URL}/system_stats", timeout=2)
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
            q_res = requests.get(f"{Flux1DevConfig.COMFY_URL}/queue", timeout=2)
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
    Primary image generation service powered by FLUX.1 Dev Q4_K_S GGUF via ComfyUI.
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
    def _build_flux1_dev_workflow(
        prompt: str,
        width: int,
        height: int,
        seed: int,
        steps: int,
        guidance: float,
        sampler: str,
        scheduler: str,
    ) -> dict:
        """
        Constructs the 14-node FLUX.1 Dev Q4 GGUF workflow for ComfyUI:
        1. UnetLoaderGGUF: flux1-dev-Q4_K_S.gguf
        2. DualCLIPLoaderGGUF: t5-v1_1-xxl-encoder-Q4_K_M.gguf + clip_l.safetensors (type=flux)
        3. VAELoader: ae.safetensors
        4. CLIPTextEncode: user prompt
        5. FluxGuidance: distilled guidance embedding (3.5)
        6. ModelSamplingFlux: resolution-aware flow-matching shift
        7. BasicGuider: single-pass guidance (optimal speed for distilled guidance)
        8. EmptySD3LatentImage: 16-channel FLUX latent
        9. KSamplerSelect: euler
        10. BasicScheduler: simple / beta schedule
        11. RandomNoise: reproducible seed
        12. SamplerCustomAdvanced: flow-matching sampling
        13. VAEDecode: latent -> image
        14. PreviewImage: temporary ComfyUI output (avoids duplicate permanent files in ComfyUI/output)
        """
        return {
            "1": {
                "inputs": {"unet_name": Flux1DevConfig.UNET_NAME},
                "class_type": "UnetLoaderGGUF",
                "_meta": {"title": "FLUX.1 Dev Q4_K_S UNet (GGUF)"},
            },
            "2": {
                "inputs": {
                    "clip_name1": Flux1DevConfig.T5_XXL_NAME,
                    "clip_name2": Flux1DevConfig.CLIP_L_NAME,
                    "type": "flux",
                },
                "class_type": "DualCLIPLoaderGGUF",
                "_meta": {"title": "Dual CLIP + T5-XXL Q4_K_M (GGUF)"},
            },
            "3": {
                "inputs": {"vae_name": Flux1DevConfig.VAE_NAME},
                "class_type": "VAELoader",
                "_meta": {"title": "FLUX.1 VAE (ae.safetensors)"},
            },
            "4": {
                "inputs": {"text": prompt, "clip": ["2", 0]},
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Positive Prompt"},
            },
            "5": {
                "inputs": {"conditioning": ["4", 0], "guidance": float(guidance)},
                "class_type": "FluxGuidance",
                "_meta": {"title": f"FluxGuidance ({guidance})"},
            },
            "6": {
                "inputs": {
                    "model": ["1", 0],
                    "max_shift": 1.15,
                    "base_shift": 0.5,
                    "width": width,
                    "height": height,
                },
                "class_type": "ModelSamplingFlux",
                "_meta": {"title": "ModelSamplingFlux"},
            },
            "7": {
                "inputs": {"model": ["6", 0], "conditioning": ["5", 0]},
                "class_type": "BasicGuider",
                "_meta": {"title": "BasicGuider"},
            },
            "8": {
                "inputs": {"width": width, "height": height, "batch_size": Flux1DevConfig.BATCH_SIZE},
                "class_type": "EmptySD3LatentImage",
                "_meta": {"title": f"Empty FLUX Latent ({width}x{height})"},
            },
            "9": {
                "inputs": {"sampler_name": sampler},
                "class_type": "KSamplerSelect",
                "_meta": {"title": f"KSamplerSelect ({sampler})"},
            },
            "10": {
                "inputs": {
                    "model": ["6", 0],
                    "scheduler": scheduler,
                    "steps": int(steps),
                    "denoise": 1.0,
                },
                "class_type": "BasicScheduler",
                "_meta": {"title": f"BasicScheduler ({scheduler}, {steps} steps)"},
            },
            "11": {
                "inputs": {"noise_seed": int(seed)},
                "class_type": "RandomNoise",
                "_meta": {"title": "RandomNoise"},
            },
            "12": {
                "inputs": {
                    "noise": ["11", 0],
                    "guider": ["7", 0],
                    "sampler": ["9", 0],
                    "sigmas": ["10", 0],
                    "latent_image": ["8", 0],
                },
                "class_type": "SamplerCustomAdvanced",
                "_meta": {"title": "SamplerCustomAdvanced"},
            },
            "13": {
                "inputs": {"samples": ["12", 0], "vae": ["3", 0]},
                "class_type": "VAEDecode",
                "_meta": {"title": "VAE Decode"},
            },
            "14": {
                "inputs": {"images": ["13", 0]},
                "class_type": "PreviewImage",
                "_meta": {"title": "PreviewImage Output"},
            },
        }

    def _validate_request_and_hardware(self, prompt_data: dict) -> tuple[str, dict, int, dict]:
        if not Flux1DevConfig.is_checkpoint_available():
            raise ConfigurationError(
                "FLUX.1 Dev model files not found in ComfyUI models directory. "
                f"UNet({Flux1DevConfig.UNET_NAME}): {Flux1DevConfig.UNET_PATH.exists()}, "
                f"CLIP-L({Flux1DevConfig.CLIP_L_NAME}): {Flux1DevConfig.CLIP_L_PATH.exists()}, "
                f"T5-XXL({Flux1DevConfig.T5_XXL_NAME}): {Flux1DevConfig.T5_XXL_PATH.exists()}, "
                f"VAE({Flux1DevConfig.VAE_NAME}): {Flux1DevConfig.VAE_PATH.exists()}."
            )

        prompt = (prompt_data.get("prompt") or "").strip()
        if not prompt:
            raise GenerationError("Cannot generate image with an empty prompt.")

        preset_id = (prompt_data.get("preset") or Flux1DevConfig.DEFAULT_PRESET).strip().lower()
        preset = Flux1DevConfig.get_preset(preset_id)

        dimensions = prompt_data.get("dimensions") or Flux1DevConfig.get_dimensions(
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

        # Pre-flight GPU VRAM check (never crash blindly if another app holds all VRAM)
        smi = SystemMonitor.query_nvidia_smi()
        if smi and smi["vram_total_mb"] > 0 and smi["vram_free_mb"] < 900:
            # Ask ComfyUI to free any cached tensors/models first before failing
            self._free_comfy_memory()

        return prompt, {"width": width, "height": height}, seed, preset

    @staticmethod
    def _free_comfy_memory():
        try:
            requests.post(
                f"{Flux1DevConfig.COMFY_URL}/free",
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
        Starts an asynchronous FLUX.1 Dev generation job and returns immediately with job status.
        Prevents concurrent GPU execution via a single-execution lock and rejects duplicate active jobs per user.
        """
        prompt, dims, seed, preset = self._validate_request_and_hardware(prompt_data)
        ComfyUIProcessManager.ensure_server()

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
                requests.post(f"{Flux1DevConfig.COMFY_URL}/queue", json={"delete": [prompt_id]}, timeout=3)
            requests.post(f"{Flux1DevConfig.COMFY_URL}/interrupt", timeout=3)
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
                "developer": Flux1DevConfig.DEVELOPER,
                "architecture": Flux1DevConfig.ARCHITECTURE,
                "quantization": result["quantization"],
                "license": result["license"],
                "preset": result["preset"],
                "preset_label": result["preset_label"],
                "steps": result["steps"],
                "guidance_scale": result["guidance_scale"],
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
            )
        except CudaOOMError as e:
            self._update_job(job_id, status="error", stage="GPU memory limit reached", error=str(e), error_type="CudaOOMError")
        except ConfigurationError as e:
            self._update_job(job_id, status="error", stage="Configuration error", error=str(e), error_type="ConfigurationError")
        except Exception as e:
            logger.exception("Async generation job %s failed", job_id)
            self._update_job(job_id, status="error", stage="Generation failed", error=str(e), error_type="GenerationError")

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
                logger.info("FLUX.1 DEV Q4 GGUF GENERATION DISPATCH (%s)", preset["label"].upper())
                logger.info(
                    "Model: %s | Resolution: %dx%d | Seed: %d | Steps: %d | Guidance: %.1f | %s/%s",
                    Flux1DevConfig.MODEL_NAME, width, height, seed, steps, guidance, sampler, scheduler,
                )
                logger.info("PROMPT: %s", prompt)
                logger.info("=" * 80)

                workflow = self._build_flux1_dev_workflow(
                    prompt=prompt,
                    width=width,
                    height=height,
                    seed=seed,
                    steps=steps,
                    guidance=guidance,
                    sampler=sampler,
                    scheduler=scheduler,
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
                    "model": Flux1DevConfig.MODEL_NAME,
                    "developer": Flux1DevConfig.DEVELOPER,
                    "architecture": Flux1DevConfig.ARCHITECTURE,
                    "provider": Flux1DevConfig.PROVIDER,
                    "preset": preset["id"],
                    "preset_label": preset["label"],
                    "steps": steps,
                    "guidance_scale": guidance,
                    "sampler": sampler,
                    "scheduler": scheduler,
                    "model_load_time_sec": round(model_load_sec, 2),
                    "generation_time_sec": duration_sec,
                    "license": Flux1DevConfig.LICENSE,
                    "quantization": Flux1DevConfig.QUANTIZATION,
                    "execution": Flux1DevConfig.EXECUTION_PROFILE,
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
        ws_url = f"{Flux1DevConfig.COMFY_WS_URL}?clientId={client_id}"
        http_timeout = aiohttp.ClientTimeout(total=30)

        load_start: float | None = None
        model_load_sec = 0.0
        prompt_id: str | None = None
        start_wall = time.time()

        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url, heartbeat=15) as ws:
                self._update_job(job_id, status="loading_model", stage="Submitting workflow to ComfyUI...", progress_pct=2.0)

                async with session.post(
                    f"{Flux1DevConfig.COMFY_URL}/prompt",
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

                self._update_job(job_id, prompt_id=prompt_id, status="loading_model", stage="Preparing FLUX.1 Dev model...", progress_pct=5.0)

                while time.time() - start_wall < timeout:
                    if job_id:
                        with self._jobs_lock:
                            if self._jobs.get(job_id, {}).get("cancel_requested"):
                                raise CancelledGenerationError("Cancelled during generation.")

                    try:
                        msg = await asyncio.wait_for(ws.receive(), timeout=1.0)
                    except asyncio.TimeoutError:
                        # Periodic history fallback check in case execution completed right between messages
                        done, out_bytes = await self._check_history_async(session, prompt_id)
                        if done:
                            return out_bytes, model_load_sec
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
                                # Execution completed for this prompt_id
                                break
                            if node in ("1", "2", "3"):
                                if load_start is None:
                                    load_start = time.time()
                                self._update_job(
                                    job_id,
                                    status="loading_model",
                                    stage="Loading FLUX.1 Dev Q4 & T5-XXL into GPU/RAM...",
                                    progress_pct=6.0,
                                )
                            elif node in ("4", "5", "6", "7", "8", "9", "10", "11"):
                                if load_start is not None and model_load_sec == 0.0:
                                    model_load_sec = time.time() - load_start
                                self._update_job(
                                    job_id,
                                    status="encoding",
                                    stage="Encoding campaign prompt with CLIP-L & T5-XXL...",
                                    progress_pct=10.0,
                                    model_load_time_sec=round(model_load_sec, 2),
                                )
                            elif node == "12":
                                if load_start is not None and model_load_sec == 0.0:
                                    model_load_sec = time.time() - load_start
                                self._update_job(
                                    job_id,
                                    status="sampling",
                                    stage=f"Sampling FLUX.1 Dev (0/{steps} steps)...",
                                    progress_pct=12.0,
                                    model_load_time_sec=round(model_load_sec, 2),
                                )
                            elif node in ("13", "14"):
                                self._update_job(
                                    job_id,
                                    status="decoding",
                                    stage="Decoding latent image with FLUX VAE...",
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
                                stage=f"Sampling FLUX.1 Dev ({val}/{mx} steps)...",
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
                                    "CUDA Out of Memory during FLUX.1 Dev inference. "
                                    "Switch to Fast Mode (512x512) or close other GPU applications and retry."
                                )
                            raise GenerationError(f"ComfyUI execution failed: {exc_msg}")

                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        break

                # Fetch final image from ComfyUI history
                for _ in range(15):
                    done, out_bytes = await self._check_history_async(session, prompt_id)
                    if done:
                        return out_bytes, model_load_sec
                    await asyncio.sleep(0.4)

        raise GenerationError(f"FLUX.1 Dev generation timed out after {timeout} seconds.")

    async def _check_history_async(self, session: aiohttp.ClientSession, prompt_id: str) -> tuple[bool, bytes]:
        async with session.get(f"{Flux1DevConfig.COMFY_URL}/history/{prompt_id}", timeout=aiohttp.ClientTimeout(total=10)) as res:
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
                        "CUDA Out of Memory during FLUX.1 Dev inference. "
                        "Try Fast Mode (512x512) or free GPU memory and retry."
                    )
                raise GenerationError(f"ComfyUI execution failed: {err_msg}")

            outputs = item.get("outputs", {})
            save_node = outputs.get("14") or next((v for v in outputs.values() if "images" in v), {})
            images = save_node.get("images", [])
            if not images:
                return False, b""

            img_meta = images[0]
            url = (
                f"{Flux1DevConfig.COMFY_URL}/view"
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
        """Validates and persists image as lossless PNG with Pillow."""
        unique_id = uuid.uuid4().hex[:12]
        timestamp = int(time.time())
        filename = f"campaign_{unique_id}_{timestamp}.png"
        file_path = self.output_dir / filename

        try:
            with Image.open(io.BytesIO(image_bytes)) as image:
                image.save(file_path, format="PNG", optimize=True)
                width, height = image.width, image.height
            file_size = os.path.getsize(file_path)
            return {
                "filename": filename,
                "file_path": str(file_path),
                "filepath": str(file_path),
                "width": width,
                "height": height,
                "file_size": file_size,
            }
        except Exception as e:
            raise GenerationError(f"Pillow image processing error: {str(e)}")


image_generator_service = ImageGeneratorService()
image_generator = image_generator_service
