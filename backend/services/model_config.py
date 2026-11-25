"""
FLUX.2 Klein 4B Q4 Model Configuration for ComfyUI Integration.
Architecture: Distilled 4B flow-matching transformer with Qwen3-4B text encoder.
Quantization: Q4_K_M GGUF (moonbox-dev/FLUX.2-klein-4B-GGUF).
Base Model: black-forest-labs/FLUX.2-klein-4B (Apache 2.0 License).
Execution: NVIDIA GPU + CPU offloading where supported.
Optimized for 4-step distilled inference at 512x512 resolution.
"""

import os
from pathlib import Path

class Flux2KleinConfig:
    # Model Identity & Licensing
    MODEL_NAME = "FLUX.2 Klein 4B Q4"
    BASE_MODEL = "black-forest-labs/FLUX.2-klein-4B"
    GGUF_SOURCE = "moonbox-dev/FLUX.2-klein-4B-GGUF"
    QUANTIZATION = "Q4_K_M GGUF"
    LICENSE = "Apache 2.0 (Commercial & Research Cleared)"
    IS_COMMERCIAL_CLEARED = True

    # Checkpoints & Files
    UNET_NAME = "flux-2-klein-4b-Q4_K_M.gguf"
    CLIP_NAME = "qwen_3_4b.safetensors"
    VAE_NAME = "flux2-vae.safetensors"

    # Directory Structure
    COMFY_DIR = Path(os.getenv("COMFY_DIR", r"C:\Users\deepa\ComfyUI"))
    UNET_PATH = COMFY_DIR / "models" / "unet" / UNET_NAME
    CLIP_PATH = COMFY_DIR / "models" / "clip" / CLIP_NAME
    VAE_PATH = COMFY_DIR / "models" / "vae" / VAE_NAME

    # Hardware & Performance Parameters
    DEFAULT_WIDTH = 512
    DEFAULT_HEIGHT = 512
    INFERENCE_STEPS = 4           # 4-step distilled flow matching
    CFG_SCALE = 1.0               # CFG 1.0 with ConditioningZeroOut for distilled Klein
    SAMPLER_NAME = "euler"
    SCHEDULER = "Flux2Scheduler"
    BATCH_SIZE = 1
    SPEED_TARGET = "< 10 seconds"

    # ComfyUI Local Server Endpoints
    COMFY_HOST = os.getenv("COMFY_HOST", "127.0.0.1")
    COMFY_PORT = int(os.getenv("COMFY_PORT", "8188"))
    COMFY_URL = f"http://{COMFY_HOST}:{COMFY_PORT}"
    COMFY_WS_URL = f"ws://{COMFY_HOST}:{COMFY_PORT}/ws"

    # Hardware & Execution Profile
    PROVIDER = "Local ComfyUI"
    EXECUTION_PROFILE = "NVIDIA GPU + CPU offloading where supported"
    LOW_VRAM = False

    @classmethod
    def is_checkpoint_available(cls) -> bool:
        """Verifies that UNet, CLIP, and VAE exist on disk and are complete."""
        unet_ok = cls.UNET_PATH.exists() and cls.UNET_PATH.stat().st_size >= 2200000000
        clip_ok = cls.CLIP_PATH.exists() and cls.CLIP_PATH.stat().st_size >= 8000000000
        vae_ok = cls.VAE_PATH.exists() and cls.VAE_PATH.stat().st_size >= 300000000
        return unet_ok and clip_ok and vae_ok

    @classmethod
    def get_info(cls) -> dict:
        """Returns comprehensive metadata for frontend and API status responses."""
        checkpoint_ready = cls.is_checkpoint_available()
        return {
            "model_name": cls.MODEL_NAME,
            "provider": cls.PROVIDER,
            "status": "Ready" if checkpoint_ready else "Model Not Available",
            "quantization": cls.QUANTIZATION,
            "base_model": cls.BASE_MODEL,
            "gguf_source": cls.GGUF_SOURCE,
            "unet_name": cls.UNET_NAME,
            "unet_exists": cls.UNET_PATH.exists(),
            "clip_name": cls.CLIP_NAME,
            "clip_exists": cls.CLIP_PATH.exists(),
            "vae_name": cls.VAE_NAME,
            "vae_exists": cls.VAE_PATH.exists(),
            "license": cls.LICENSE,
            "commercial_cleared": cls.IS_COMMERCIAL_CLEARED,
            "execution": cls.EXECUTION_PROFILE,
            "default_resolution": f"{cls.DEFAULT_WIDTH}x{cls.DEFAULT_HEIGHT}",
            "inference_steps": cls.INFERENCE_STEPS,
            "cfg_scale": cls.CFG_SCALE,
            "sampler": cls.SAMPLER_NAME,
            "scheduler": cls.SCHEDULER,
            "speed_target": cls.SPEED_TARGET
        }

# Backwards compatibility aliases
FluxModelConfig = Flux2KleinConfig
SDXLTurboConfig = Flux2KleinConfig
