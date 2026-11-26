"""
FLUX.2 Klein 4B Q4_K_M Model Configuration for ComfyUI Integration.
Developer: Black Forest Labs
Architecture: 4B Distilled Flow-Matching Transformer with Qwen3-4B Text Encoder.
Quantization: Q4_K_M GGUF (moonbox-dev/FLUX.2-klein-4B-GGUF) + qwen_3_4b.safetensors + flux2-vae.safetensors.
License: Apache 2.0 (Commercial & Research Cleared).
Execution: NVIDIA GPU + CPU offloading where supported.
"""

import os
from pathlib import Path


GENERATION_PRESETS = {
    "fast": {
        "id": "fast",
        "label": "Fast Mode",
        "description": "512px base resolution, 4 distilled steps — ultra-fast campaign iteration",
        "steps": 4,
        "guidance": 1.0,
        "cfg": 1.0,
        "sampler": "euler",
        "scheduler": "Flux2Scheduler",
        "aspect_ratios": {
            "1:1": {"width": 512, "height": 512, "label": "Square (1:1)"},
            "4:5": {"width": 512, "height": 640, "label": "Portrait (4:5)"},
            "16:9": {"width": 640, "height": 384, "label": "Landscape (16:9)"},
        },
    },
    "quality": {
        "id": "quality",
        "label": "Quality Mode",
        "description": "768px base resolution, 8 steps — higher resolution & fine campaign details",
        "steps": 8,
        "guidance": 1.0,
        "cfg": 1.0,
        "sampler": "euler",
        "scheduler": "Flux2Scheduler",
        "aspect_ratios": {
            "1:1": {"width": 768, "height": 768, "label": "Square (1:1)"},
            "4:5": {"width": 640, "height": 800, "label": "Portrait (4:5)"},
            "16:9": {"width": 896, "height": 512, "label": "Landscape (16:9)"},
        },
    },
}


class Flux2KleinConfig:
    # Model Identity & Licensing
    MODEL_NAME = "FLUX.2 Klein 4B Q4"
    DEVELOPER = "Black Forest Labs"
    ARCHITECTURE = "4B Distilled Flow-Matching Transformer"
    BASE_MODEL = "black-forest-labs/FLUX.2-klein-4B"
    GGUF_SOURCE = "moonbox-dev/FLUX.2-klein-4B-GGUF"
    QUANTIZATION = "Q4_K_M GGUF"
    LICENSE = "Apache 2.0 (Commercial & Research Cleared)"
    IS_COMMERCIAL_CLEARED = True

    # Checkpoints & Files (stored in ComfyUI models directory)
    UNET_NAME = os.getenv("FLUX_UNET_NAME", "flux-2-klein-4b-Q4_K_M.gguf")
    CLIP_NAME = os.getenv("FLUX_CLIP_NAME", "qwen_3_4b.safetensors")
    VAE_NAME = os.getenv("FLUX_VAE_NAME", "flux2-vae.safetensors")

    # Directory Structure
    COMFY_DIR = Path(os.getenv("COMFY_DIR", r"C:\Users\deepa\ComfyUI"))
    UNET_PATH = COMFY_DIR / "models" / "unet" / UNET_NAME
    CLIP_PATH = COMFY_DIR / "models" / "clip" / CLIP_NAME
    VAE_PATH = COMFY_DIR / "models" / "vae" / VAE_NAME

    # Default Hardware & Inference Parameters (Fast Mode default)
    DEFAULT_PRESET = "fast"
    DEFAULT_WIDTH = 512
    DEFAULT_HEIGHT = 512
    INFERENCE_STEPS = GENERATION_PRESETS["fast"]["steps"]
    GUIDANCE_SCALE = GENERATION_PRESETS["fast"]["guidance"]
    CFG_SCALE = GENERATION_PRESETS["fast"]["cfg"]
    SAMPLER_NAME = GENERATION_PRESETS["fast"]["sampler"]
    SCHEDULER = GENERATION_PRESETS["fast"]["scheduler"]
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
    def get_preset(cls, preset_id: str) -> dict:
        key = (preset_id or cls.DEFAULT_PRESET).strip().lower()
        return GENERATION_PRESETS.get(key, GENERATION_PRESETS[cls.DEFAULT_PRESET])

    @classmethod
    def get_dimensions(cls, aspect_ratio: str = "1:1", preset_id: str = "fast") -> dict:
        preset = cls.get_preset(preset_id)
        ratios = preset["aspect_ratios"]
        return dict(ratios.get(aspect_ratio, ratios["1:1"]))

    @classmethod
    def is_checkpoint_available(cls) -> bool:
        """Verifies that FLUX.2 Klein UNet, Qwen3-4B text encoder, and FLUX.2 VAE exist and are complete."""
        unet_ok = cls.UNET_PATH.exists() and cls.UNET_PATH.stat().st_size >= 2_200_000_000
        clip_ok = cls.CLIP_PATH.exists() and cls.CLIP_PATH.stat().st_size >= 8_000_000_000
        vae_ok = cls.VAE_PATH.exists() and cls.VAE_PATH.stat().st_size >= 300_000_000
        return unet_ok and clip_ok and vae_ok

    @classmethod
    def get_info(cls, preset_id: str = "fast") -> dict:
        """Returns comprehensive metadata for frontend and API status responses."""
        checkpoint_ready = cls.is_checkpoint_available()
        preset = cls.get_preset(preset_id)
        return {
            "model_name": cls.MODEL_NAME,
            "developer": cls.DEVELOPER,
            "architecture": cls.ARCHITECTURE,
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
            "preset": preset["id"],
            "preset_label": preset["label"],
            "default_resolution": f"{preset['aspect_ratios']['1:1']['width']}x{preset['aspect_ratios']['1:1']['height']}",
            "inference_steps": preset["steps"],
            "guidance_scale": preset["guidance"],
            "cfg_scale": preset["cfg"],
            "sampler": preset["sampler"],
            "scheduler": preset["scheduler"],
            "speed_target": cls.SPEED_TARGET,
            "presets": {
                k: {
                    "id": v["id"],
                    "label": v["label"],
                    "description": v["description"],
                    "steps": v["steps"],
                    "guidance": v["guidance"],
                    "sampler": v["sampler"],
                    "scheduler": v["scheduler"],
                    "aspect_ratios": v["aspect_ratios"],
                }
                for k, v in GENERATION_PRESETS.items()
            },
        }
