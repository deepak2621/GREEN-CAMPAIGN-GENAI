"""
FLUX.2 Klein 4B Q4 Image Generation Service for Green Campaign AI.
Integrates local ComfyUI workflow utilizing Black Forest Labs' FLUX.2 Klein 4B (Distilled).
Quantization: Q4_K_M GGUF (moonbox-dev/FLUX.2-klein-4B-GGUF).
Text Encoder: Qwen3-4B (qwen_3_4b.safetensors).
VAE: FLUX.2 VAE (flux2-vae.safetensors).
Optimized for NVIDIA GeForce RTX GPU with 16 GB System RAM.
Sub-10-second inference at 512x512 with 4 inference steps and CFGGuider 1.0.
Apache 2.0 License compliance (Commercial & Research Cleared).
"""

import os
import io
import time
import uuid
import random
import json
import logging
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path
import requests
from PIL import Image

from backend.config import Config
from backend.services.model_config import Flux2KleinConfig, FluxModelConfig, SDXLTurboConfig

logger = logging.getLogger("green_campaign_ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class GenerationError(Exception):
    """Base exception for image generation failures."""
    pass

class ConfigurationError(Exception):
    """Raised when required model files or configuration are missing."""
    pass

class RateLimitError(GenerationError):
    """Retained for backward compatibility with existing route error handlers."""
    def __init__(self, message: str, retry_after: int = 0):
        super().__init__(message)
        self.retry_after = retry_after

class ServiceBusyError(GenerationError):
    """Raised when ComfyUI queue is busy or model is currently in inference."""
    pass

class ModelNotReadyError(GenerationError):
    """Raised when the local FLUX.2 Klein model server is still booting or loading."""
    pass

class CudaOOMError(GenerationError):
    """Raised when GPU VRAM runs out during diffusion inference."""
    pass

class ComfyUIProcessManager:
    """Manages the local ComfyUI server lifecycle for FLUX.2 Klein 4B Q4 inference."""
    _process = None

    @classmethod
    def is_running(cls) -> bool:
        """Checks whether the ComfyUI HTTP server is responsive."""
        try:
            res = requests.get(f"{Flux2KleinConfig.COMFY_URL}/system_stats", timeout=3)
            return res.status_code == 200
        except Exception:
            return False

    @classmethod
    def ensure_server(cls):
        """Launches ComfyUI server if not already active."""
        if cls.is_running():
            return True

        comfy_dir = Flux2KleinConfig.COMFY_DIR
        main_py = comfy_dir / "main.py"
        if not main_py.exists():
            raise ConfigurationError(
                f"ComfyUI installation not found at '{comfy_dir}'. "
                "Please verify ComfyUI repository location."
            )

        logger.info("Launching local ComfyUI server for FLUX.2 Klein 4B Q4 with fast-disk and FP8 text encoder flags...")
        cmd = [
            "python",
            str(main_py),
            "--listen", Flux2KleinConfig.COMFY_HOST,
            "--port", str(Flux2KleinConfig.COMFY_PORT),
            "--disable-auto-launch",
            "--fp8_e4m3fn-text-enc",
            "--fast-disk",
            "--high-ram"
        ]

        cls._process = subprocess.Popen(
            cmd,
            cwd=str(comfy_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        for _ in range(35):
            time.sleep(1)
            if cls.is_running():
                logger.info("Local ComfyUI server online and responding on port %d", Flux2KleinConfig.COMFY_PORT)
                return True

        raise ModelNotReadyError(
            "Local ComfyUI server started but did not respond within 35 seconds."
        )

    @classmethod
    def ensure_running(cls):
        return cls.ensure_server()

class ImageGeneratorService:
    """
    Primary image generation service powered by FLUX.2 Klein 4B Q4 (Distilled).
    Dispatches 4-step distilled generation to local ComfyUI server.
    Achieves sub-10-second latency on local NVIDIA GPU with CPU offloading where supported.
    """
    def __init__(self):
        self.output_dir = Path(Config.GENERATED_IMAGES_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.client_id = f"green_ai_{uuid.uuid4().hex[:8]}"

    @classmethod
    def get_cooldown_remaining(cls) -> int:
        """Local FLUX.2 Klein 4B Q4 does not enforce arbitrary IP cooldowns."""
        return 0

    @classmethod
    def get_system_metrics(cls) -> dict:
        """Queries ComfyUI for real-time GPU VRAM and system memory utilization."""
        try:
            res = requests.get(f"{Flux2KleinConfig.COMFY_URL}/system_stats", timeout=4)
            if res.status_code == 200:
                data = res.json()
                devices = data.get("devices", [])
                gpu_info = devices[0] if devices else {}
                return {
                    "server_online": True,
                    "gpu_name": gpu_info.get("name", "NVIDIA GeForce RTX"),
                    "vram_total_mb": int(gpu_info.get("vram_total", 0) / (1024 * 1024)),
                    "vram_free_mb": int(gpu_info.get("vram_free", 0) / (1024 * 1024)),
                    "torch_version": gpu_info.get("torch_version", "2.6.0+cu124")
                }
        except Exception:
            pass
        return {
            "server_online": False,
            "gpu_name": "NVIDIA GeForce RTX",
            "vram_total_mb": 6144,
            "vram_free_mb": 5000,
            "torch_version": "2.6.0+cu124"
        }

    def _build_flux2_klein_workflow(self, prompt: str, width: int, height: int, seed: int) -> dict:
        """
        Constructs the official 13-node FLUX.2 Klein 4B distilled workflow for ComfyUI.
        Components:
        1. UnetLoaderGGUF: flux-2-klein-4b-Q4_K_M.gguf
        2. CLIPLoader: qwen_3_4b.safetensors (type: flux2)
        3. VAELoader: flux2-vae.safetensors
        4. CLIPTextEncode: positive prompt encoded via Qwen3-4B
        5. ConditioningZeroOut: zero negative conditioning
        6. CFGGuider: cfg=1.0 for distilled flow matching
        7. EmptyFlux2LatentImage: latent representation
        8. KSamplerSelect: euler
        9. Flux2Scheduler: 4 steps
        10. RandomNoise: seed
        11. SamplerCustomAdvanced: custom flow matching sampler
        12. VAEDecode: decodes latent to image
        13. SaveImage: outputs lossless image
        """
        return {
            "1": {
                "inputs": {
                    "unet_name": Flux2KleinConfig.UNET_NAME
                },
                "class_type": "UnetLoaderGGUF",
                "_meta": {"title": "FLUX.2 Klein 4B Q4_K_M UNet (GGUF)"}
            },
            "2": {
                "inputs": {
                    "clip_name": Flux2KleinConfig.CLIP_NAME,
                    "type": "flux2"
                },
                "class_type": "CLIPLoader",
                "_meta": {"title": "Qwen3-4B Text Encoder (FLUX.2)"}
            },
            "3": {
                "inputs": {
                    "vae_name": Flux2KleinConfig.VAE_NAME
                },
                "class_type": "VAELoader",
                "_meta": {"title": "FLUX.2 VAE"}
            },
            "4": {
                "inputs": {
                    "text": prompt,
                    "clip": ["2", 0]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Positive Prompt"}
            },
            "5": {
                "inputs": {
                    "conditioning": ["4", 0]
                },
                "class_type": "ConditioningZeroOut",
                "_meta": {"title": "Zero Negative Conditioning"}
            },
            "6": {
                "inputs": {
                    "model": ["1", 0],
                    "positive": ["4", 0],
                    "negative": ["5", 0],
                    "cfg": Flux2KleinConfig.CFG_SCALE
                },
                "class_type": "CFGGuider",
                "_meta": {"title": "CFG Guider (1.0)"}
            },
            "7": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": Flux2KleinConfig.BATCH_SIZE
                },
                "class_type": "EmptyFlux2LatentImage",
                "_meta": {"title": f"Empty FLUX.2 Latent ({width}x{height})"}
            },
            "8": {
                "inputs": {
                    "sampler_name": Flux2KleinConfig.SAMPLER_NAME
                },
                "class_type": "KSamplerSelect",
                "_meta": {"title": "KSampler Select (Euler)"}
            },
            "9": {
                "inputs": {
                    "steps": Flux2KleinConfig.INFERENCE_STEPS,
                    "width": width,
                    "height": height
                },
                "class_type": "Flux2Scheduler",
                "_meta": {"title": f"Flux2Scheduler ({Flux2KleinConfig.INFERENCE_STEPS} steps)"}
            },
            "10": {
                "inputs": {
                    "noise_seed": seed
                },
                "class_type": "RandomNoise",
                "_meta": {"title": "Random Noise"}
            },
            "11": {
                "inputs": {
                    "noise": ["10", 0],
                    "guider": ["6", 0],
                    "sampler": ["8", 0],
                    "sigmas": ["9", 0],
                    "latent_image": ["7", 0]
                },
                "class_type": "SamplerCustomAdvanced",
                "_meta": {"title": "Sampler Custom Advanced"}
            },
            "12": {
                "inputs": {
                    "samples": ["11", 0],
                    "vae": ["3", 0]
                },
                "class_type": "VAEDecode",
                "_meta": {"title": "VAE Decode"}
            },
            "13": {
                "inputs": {
                    "filename_prefix": "flux2_klein_green_campaign",
                    "images": ["12", 0]
                },
                "class_type": "SaveImage",
                "_meta": {"title": "Save FLUX.2 Klein Image"}
            }
        }

    # Aliases for backwards compatibility
    _build_flux_workflow = _build_flux2_klein_workflow
    _build_sdxl_turbo_workflow = _build_flux2_klein_workflow

    def generate(self, prompt_data: dict) -> dict:
        """
        Executes local FLUX.2 Klein 4B Q4 generation via ComfyUI.
        Dispatches 13-node workflow, monitors execution, retrieves image bytes,
        and saves validated PNG to disk within sub-10s latency after initial load.
        """
        start_time = time.time()

        if not Flux2KleinConfig.is_checkpoint_available():
            raise ConfigurationError(
                f"FLUX.2 Klein files not found. "
                f"UNet: {Flux2KleinConfig.UNET_PATH.exists()}, "
                f"CLIP: {Flux2KleinConfig.CLIP_PATH.exists()}, "
                f"VAE: {Flux2KleinConfig.VAE_PATH.exists()}."
            )

        prompt = prompt_data.get("prompt", "")
        dimensions = prompt_data.get("dimensions", {"width": Flux2KleinConfig.DEFAULT_WIDTH, "height": Flux2KleinConfig.DEFAULT_HEIGHT})
        width = int(dimensions.get("width", Flux2KleinConfig.DEFAULT_WIDTH))
        height = int(dimensions.get("height", Flux2KleinConfig.DEFAULT_HEIGHT))

        seed = prompt_data.get("seed")
        if seed is None or seed == "" or not str(seed).isdigit():
            seed = random.randint(100000, 99999999)
        else:
            seed = int(seed)

        if not prompt or not prompt.strip():
            raise GenerationError("Cannot generate image with empty prompt.")

        logger.info("=" * 80)
        logger.info("FLUX.2 KLEIN 4B Q4 LOCAL COMFYUI GENERATION DISPATCH")
        logger.info("Model: %s | Quantization: %s", Flux2KleinConfig.MODEL_NAME, Flux2KleinConfig.QUANTIZATION)
        logger.info("UNet: %s | CLIP: %s | VAE: %s", Flux2KleinConfig.UNET_NAME, Flux2KleinConfig.CLIP_NAME, Flux2KleinConfig.VAE_NAME)
        logger.info("Resolution: %dx%d | Seed: %d | Steps: %d | CFG: %.1f | Sampler: %s / %s",
                    width, height, seed, Flux2KleinConfig.INFERENCE_STEPS, Flux2KleinConfig.CFG_SCALE,
                    Flux2KleinConfig.SAMPLER_NAME, Flux2KleinConfig.SCHEDULER)
        logger.info("License: %s", Flux2KleinConfig.LICENSE)
        logger.info("FLUX.2 KLEIN PROMPT:\n%s", prompt)
        logger.info("=" * 80)

        # 1. Ensure ComfyUI server is alive
        ComfyUIProcessManager.ensure_server()

        # 2. Build and submit FLUX.2 Klein 4B workflow
        workflow = self._build_flux2_klein_workflow(prompt, width, height, seed)
        submit_payload = {
            "prompt": workflow,
            "client_id": self.client_id
        }

        try:
            res = requests.post(f"{Flux2KleinConfig.COMFY_URL}/prompt", json=submit_payload, timeout=20)
            if res.status_code != 200:
                err_text = res.text
                if "CUDA out of memory" in err_text:
                    raise CudaOOMError("GPU VRAM exceeded during FLUX.2 Klein inference.")
                raise GenerationError(f"ComfyUI submission error ({res.status_code}): {err_text}")
            
            queue_data = res.json()
            prompt_id = queue_data.get("prompt_id")
            if not prompt_id:
                raise GenerationError("ComfyUI did not return a valid prompt ID.")
        except requests.RequestException as e:
            raise GenerationError(f"Failed to communicate with local ComfyUI server: {str(e)}")

        # 3. Wait for generation to complete
        logger.info("FLUX.2 Klein prompt queued (ID: %s). Monitoring execution...", prompt_id)
        image_bytes = self._poll_history(prompt_id)

        # 4. Save and validate image
        saved_info = self._process_and_save(image_bytes, width, height)
        duration_sec = round(time.time() - start_time, 2)
        logger.info("Generation successful! Total pipeline time: %.2f seconds", duration_sec)

        saved_info["seed"] = seed
        saved_info["model"] = Flux2KleinConfig.MODEL_NAME
        saved_info["provider"] = Flux2KleinConfig.PROVIDER
        saved_info["generation_time_sec"] = duration_sec
        saved_info["license"] = Flux2KleinConfig.LICENSE
        saved_info["quantization"] = Flux2KleinConfig.QUANTIZATION
        saved_info["execution"] = Flux2KleinConfig.EXECUTION_PROFILE
        return saved_info

    def _poll_history(self, prompt_id: str, timeout: int = 180) -> bytes:
        """Polls ComfyUI /history/{prompt_id} until the output image is generated."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                res = requests.get(f"{Flux2KleinConfig.COMFY_URL}/history/{prompt_id}", timeout=10)
                if res.status_code == 200:
                    history = res.json()
                    if prompt_id in history:
                        item = history[prompt_id]
                        status = item.get("status", {})
                        if status.get("status_str") == "error":
                            messages = status.get("messages", [])
                            err_msg = messages[0] if messages else "Execution error in ComfyUI"
                            if "CUDA out of memory" in str(err_msg):
                                raise CudaOOMError("CUDA out of memory during FLUX.2 Klein inference.")
                            raise GenerationError(f"ComfyUI execution failed: {err_msg}")

                        outputs = item.get("outputs", {})
                        # Node 13 is SaveImage
                        save_node = outputs.get("13") or next((v for v in outputs.values() if "images" in v), {})
                        images = save_node.get("images", [])
                        if images:
                            img_meta = images[0]
                            return self._fetch_comfy_image(
                                img_meta["filename"],
                                img_meta.get("subfolder", ""),
                                img_meta.get("type", "output")
                            )
            except (GenerationError, CudaOOMError):
                raise
            except Exception:
                pass
            time.sleep(0.8)

        raise GenerationError(f"FLUX.2 Klein generation timed out after {timeout} seconds.")

    def _fetch_comfy_image(self, filename: str, subfolder: str, img_type: str) -> bytes:
        """Retrieves raw image bytes from ComfyUI /view endpoint."""
        url = (
            f"{Flux2KleinConfig.COMFY_URL}/view"
            f"?filename={urllib.parse.quote(filename)}"
            f"&subfolder={urllib.parse.quote(subfolder)}"
            f"&type={urllib.parse.quote(img_type)}"
        )
        res = requests.get(url, timeout=30)
        if res.status_code == 200 and res.content:
            return res.content
        raise GenerationError("Failed to fetch generated image data from ComfyUI.")

    def _process_and_save(self, image_bytes: bytes, target_w: int, target_h: int) -> dict:
        """Validates and persists image as lossless PNG with Pillow."""
        unique_id = uuid.uuid4().hex[:12]
        timestamp = int(time.time())
        filename = f"campaign_{unique_id}_{timestamp}.png"
        file_path = self.output_dir / filename

        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Verify and save format
            image.save(file_path, format="PNG", optimize=True)
            file_size = os.path.getsize(file_path)

            return {
                "filename": filename,
                "file_path": str(file_path),
                "filepath": str(file_path),
                "width": image.width,
                "height": image.height,
                "file_size": file_size
            }
        except Exception as e:
            raise GenerationError(f"Pillow image processing error: {str(e)}")

image_generator_service = ImageGeneratorService()
image_generator = image_generator_service
