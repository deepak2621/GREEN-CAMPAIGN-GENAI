"""
Test script to verify direct ComfyUI workflow execution for FLUX.2 Klein 4B Q4.
"""

import requests
import json
import time
import os
from PIL import Image

COMFY_URL = "http://127.0.0.1:8188"

workflow = {
    # 1. UNET Loader (GGUF)
    "1": {
        "inputs": {
            "unet_name": "flux-2-klein-4b-Q4_K_M.gguf"
        },
        "class_type": "UnetLoaderGGUF",
        "_meta": {"title": "FLUX.2 Klein 4B Q4_K_M UNet (GGUF)"}
    },
    # 2. CLIP Loader
    "2": {
        "inputs": {
            "clip_name": "qwen_3_4b.safetensors",
            "type": "flux2"
        },
        "class_type": "CLIPLoader",
        "_meta": {"title": "Qwen3-4B Text Encoder (FLUX.2)"}
    },
    # 3. VAE Loader
    "3": {
        "inputs": {
            "vae_name": "flux2-vae.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": {"title": "FLUX.2 VAE"}
    },
    # 4. Positive CLIP Text Encode
    "4": {
        "inputs": {
            "text": "A person turning off a running water tap, a large crystal-clear blue water droplet, clean water splash, 3D educational illustration, studio lighting, award-winning sustainability poster",
            "clip": ["2", 0]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {"title": "Positive Prompt"}
    },
    # 5. Negative Conditioning (ConditioningZeroOut)
    "5": {
        "inputs": {
            "conditioning": ["4", 0]
        },
        "class_type": "ConditioningZeroOut",
        "_meta": {"title": "Zero Negative Conditioning"}
    },
    # 6. CFG Guider (1.0 for distilled FLUX.2 Klein)
    "6": {
        "inputs": {
            "model": ["1", 0],
            "positive": ["4", 0],
            "negative": ["5", 0],
            "cfg": 1.0
        },
        "class_type": "CFGGuider",
        "_meta": {"title": "CFG Guider (1.0)"}
    },
    # 7. Empty FLUX.2 Latent Image
    "7": {
        "inputs": {
            "width": 512,
            "height": 512,
            "batch_size": 1
        },
        "class_type": "EmptyFlux2LatentImage",
        "_meta": {"title": "Empty FLUX.2 Latent (512x512)"}
    },
    # 8. KSampler Select (Euler)
    "8": {
        "inputs": {
            "sampler_name": "euler"
        },
        "class_type": "KSamplerSelect",
        "_meta": {"title": "KSampler Select (Euler)"}
    },
    # 9. Flux2Scheduler (4 steps)
    "9": {
        "inputs": {
            "steps": 4,
            "width": 512,
            "height": 512
        },
        "class_type": "Flux2Scheduler",
        "_meta": {"title": "Flux2Scheduler (4 steps)"}
    },
    # 10. Random Noise
    "10": {
        "inputs": {
            "noise_seed": 42
        },
        "class_type": "RandomNoise",
        "_meta": {"title": "Random Noise"}
    },
    # 11. Sampler Custom Advanced
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
    # 12. VAE Decode
    "12": {
        "inputs": {
            "samples": ["11", 0],
            "vae": ["3", 0]
        },
        "class_type": "VAEDecode",
        "_meta": {"title": "VAE Decode"}
    },
    # 13. Save Image
    "13": {
        "inputs": {
            "filename_prefix": "flux2_klein_test",
            "images": ["12", 0]
        },
        "class_type": "SaveImage",
        "_meta": {"title": "Save FLUX.2 Klein Image"}
    }
}

def test_workflow():
    print("=" * 80)
    print("TESTING FLUX.2 KLEIN 4B DISTILLED COMFYUI WORKFLOW")
    print("=" * 80)

    payload = {
        "prompt": workflow,
        "client_id": "test_flux2_client"
    }

    t0 = time.time()
    res = requests.post(f"{COMFY_URL}/prompt", json=payload, timeout=15)
    print(f"Submit status: {res.status_code}")
    if res.status_code != 200:
        print("Submission failed:", res.text)
        return

    data = res.json()
    prompt_id = data.get("prompt_id")
    print(f"Prompt ID: {prompt_id}")

    # Poll history
    print("Monitoring execution...")
    while time.time() - t0 < 180:
        h_res = requests.get(f"{COMFY_URL}/history/{prompt_id}")
        if h_res.status_code == 200:
            hist = h_res.json()
            if prompt_id in hist:
                status = hist[prompt_id].get("status", {})
                if status.get("status_str") == "error":
                    print("[ERROR] ComfyUI reported execution error:", status.get("messages"))
                    return

                outputs = hist[prompt_id].get("outputs", {})
                save_node = outputs.get("13", {})
                images = save_node.get("images", [])
                if images:
                    elapsed = time.time() - t0
                    img_meta = images[0]
                    print(f"\n[SUCCESS] Image generated in {elapsed:.2f} seconds!")
                    print(f"Filename: {img_meta['filename']}")

                    # Download and verify with Pillow
                    img_res = requests.get(f"{COMFY_URL}/view?filename={img_meta['filename']}&subfolder={img_meta.get('subfolder', '')}&type=output")
                    if img_res.status_code == 200:
                        img = Image.open(requests.compat.BytesIO(img_res.content))
                        print(f"Pillow verified: format={img.format}, size={img.size}, mode={img.mode}")
                    return
        time.sleep(1.0)

    print("[TIMEOUT] Execution timed out.")

if __name__ == "__main__":
    test_workflow()
