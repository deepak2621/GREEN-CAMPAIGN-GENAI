"""
FLUX.1 Dev Q4 GGUF Model Configuration for ComfyUI Integration.
Developer: Black Forest Labs
Architecture: 12B Parameter Rectified Flow Diffusion Transformer (MMDiT)
Quantization: Q4_K_S GGUF (city96/FLUX.1-dev-gguf) + T5-XXL Q4_K_M GGUF + CLIP-L FP16/FP8 + FLUX VAE.
Execution: Local NVIDIA GPU with CUDA + CPU offloading and smart VRAM management.
"""

import os
from pathlib import Path


GENERATION_PRESETS = {
    "fast": {
        "id": "fast",
        "label": "Fast Mode",
        "description": "512px base resolution, 18 steps — optimized for rapid campaign iteration",
        "steps": 18,
        "guidance": 3.5,
        "cfg": 1.0,
        "sampler": "euler",
        "scheduler": "simple",
        "aspect_ratios": {
            "1:1": {"width": 512, "height": 512, "label": "Square (1:1)"},
            "4:5": {"width": 512, "height": 640, "label": "Portrait (4:5)"},
            "16:9": {"width": 640, "height": 384, "label": "Landscape (16:9)"},
        },
    },
    "quality": {
        "id": "quality",
        "label": "Quality Mode",
        "description": "768px base resolution, 26 steps — high detail & photorealistic campaign posters",
        "steps": 26,
        "guidance": 3.5,
        "cfg": 1.0,
        "sampler": "euler",
        "scheduler": "beta",
        "aspect_ratios": {
            "1:1": {"width": 768, "height": 768, "label": "Square (1:1)"},
            "4:5": {"width": 640, "height": 800, "label": "Portrait (4:5)"},
            "16:9": {"width": 896, "height": 512, "label": "Landscape (16:9)"},
        },
    },
}


class Flux1DevConfig:
    # Model Identity & Licensing
    MODEL_NAME = "FLUX.1 Dev (Q4_K_S GGUF)"
    DEVELOPER = "Black Forest Labs"
    ARCHITECTURE = "12B Flow-Matching Transformer"
    BASE_MODEL = "black-forest-labs/FLUX.1-dev"
    GGUF_SOURCE = "city96/FLUX.1-dev-gguf"
    QUANTIZATION = "Q4_K_S GGUF (T5-XXL Q4_K_M)"
    LICENSE = "FLUX.1 [dev] Non-Commercial License"

    # Checkpoints & Files (kept outside application source directory)
    UNET_NAME = os.getenv("FLUX_UNET_NAME", "flux1-dev-Q4_K_S.gguf")
    CLIP_L_NAME = os.getenv("FLUX_CLIP_L_NAME", "clip_l.safetensors")
    T5_XXL_NAME = os.getenv("FLUX_T5_XXL_NAME", "t5-v1_1-xxl-encoder-Q4_K_M.gguf")
    VAE_NAME = os.getenv("FLUX_VAE_NAME", "ae.safetensors")

    # Directory Structure
    COMFY_DIR = Path(os.getenv("COMFY_DIR", r"C:\Users\deepa\ComfyUI"))
    UNET_PATH = COMFY_DIR / "models" / "unet" / UNET_NAME
    CLIP_L_PATH = COMFY_DIR / "models" / "clip" / CLIP_L_NAME
    T5_XXL_PATH = COMFY_DIR / "models" / "clip" / T5_XXL_NAME
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

    # ComfyUI Local Server Endpoints
    COMFY_HOST = os.getenv("COMFY_HOST", "127.0.0.1")
    COMFY_PORT = int(os.getenv("COMFY_PORT", "8188"))
    COMFY_URL = f"http://{COMFY_HOST}:{COMFY_PORT}"
    COMFY_WS_URL = f"ws://{COMFY_HOST}:{COMFY_PORT}/ws"

    # Hardware & Execution Profile
    PROVIDER = "Local ComfyUI"
    EXECUTION_PROFILE = "NVIDIA CUDA GPU + Smart CPU Offloading"

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
        """Verifies that FLUX.1 Dev UNet, CLIP-L, T5-XXL GGUF, and VAE exist on disk and are complete."""
        unet_ok = cls.UNET_PATH.exists() and cls.UNET_PATH.stat().st_size >= 5_500_000_000
        clip_l_ok = cls.CLIP_L_PATH.exists() and cls.CLIP_L_PATH.stat().st_size >= 200_000_000
        t5_ok = cls.T5_XXL_PATH.exists() and cls.T5_XXL_PATH.stat().st_size >= 2_500_000_000
        vae_ok = cls.VAE_PATH.exists() and cls.VAE_PATH.stat().st_size >= 300_000_000
        return unet_ok and clip_l_ok and t5_ok and vae_ok

    @classmethod
    def get_info(cls, preset_id: str = "fast") -> dict:
        """Returns comprehensive model metadata for frontend and API status responses."""
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
            "clip_name": f"{cls.CLIP_L_NAME} + {cls.T5_XXL_NAME}",
            "clip_l_exists": cls.CLIP_L_PATH.exists(),
            "t5_xxl_exists": cls.T5_XXL_PATH.exists(),
            "vae_name": cls.VAE_NAME,
            "vae_exists": cls.VAE_PATH.exists(),
            "license": cls.LICENSE,
            "execution": cls.EXECUTION_PROFILE,
            "preset": preset["id"],
            "preset_label": preset["label"],
            "default_resolution": f"{preset['aspect_ratios']['1:1']['width']}x{preset['aspect_ratios']['1:1']['height']}",
            "inference_steps": preset["steps"],
            "guidance_scale": preset["guidance"],
            "cfg_scale": preset["cfg"],
            "sampler": preset["sampler"],
            "scheduler": preset["scheduler"],
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


# Alias for internal callers
FluxModelConfig = Flux1DevConfig
