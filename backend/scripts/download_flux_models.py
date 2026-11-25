"""
Fast, resumable downloader for FLUX.1 Dev Q4 GGUF models and text encoders.
Downloads:
1. flux1-dev-Q4_K_S.gguf (city96/FLUX.1-dev-gguf) -> ComfyUI/models/unet
2. t5-v1_1-xxl-encoder-Q4_K_M.gguf (city96/t5-v1_1-xxl-encoder-gguf) -> ComfyUI/models/clip
3. clip_l.safetensors (comfyanonymous/flux_text_encoders) -> ComfyUI/models/clip
4. ae.safetensors (black-forest-labs/FLUX.1-dev) -> ComfyUI/models/vae
"""

import os
import sys
import time
from pathlib import Path
import requests

COMFY_ROOT = Path("C:/Users/deepa/ComfyUI")

FILES_TO_DOWNLOAD = [
    {
        "name": "clip_l.safetensors (CLIP-L text encoder)",
        "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors",
        "target": COMFY_ROOT / "models" / "clip" / "clip_l.safetensors",
        "min_size_mb": 200
    },
    {
        "name": "ae.safetensors (FLUX VAE)",
        "url": "https://huggingface.co/cocktailpeanut/xulf-schnell/resolve/main/ae.safetensors",
        "target": COMFY_ROOT / "models" / "vae" / "ae.safetensors",
        "min_size_mb": 300
    },
    {
        "name": "t5-v1_1-xxl-encoder-Q4_K_M.gguf (T5-XXL Q4 quantized text encoder)",
        "url": "https://huggingface.co/city96/t5-v1_1-xxl-encoder-gguf/resolve/main/t5-v1_1-xxl-encoder-Q4_K_M.gguf",
        "target": COMFY_ROOT / "models" / "clip" / "t5-v1_1-xxl-encoder-Q4_K_M.gguf",
        "min_size_mb": 2500
    },
    {
        "name": "flux1-dev-Q4_K_S.gguf (FLUX.1 [dev] Q4 quantized diffusion model)",
        "url": "https://huggingface.co/city96/FLUX.1-dev-gguf/resolve/main/flux1-dev-Q4_K_S.gguf",
        "target": COMFY_ROOT / "models" / "unet" / "flux1-dev-Q4_K_S.gguf",
        "min_size_mb": 6000
    }
]

def download_file(item):
    name = item["name"]
    url = item["url"]
    target = Path(item["target"])
    min_size_bytes = item["min_size_mb"] * 1024 * 1024

    target.parent.mkdir(parents=True, exist_ok=True)
    part_file = target.with_suffix(target.suffix + ".part")

    if target.exists() and target.stat().st_size >= min_size_bytes:
        size_gb = target.stat().st_size / (1024**3)
        print(f"[SKIP] {name} already exists ({size_gb:.2f} GB).", flush=True)
        return

    print(f"\n---> Starting download for: {name}", flush=True)
    print(f"     Target: {target}", flush=True)
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    existing_bytes = 0
    mode = "wb"
    
    if part_file.exists():
        existing_bytes = part_file.stat().st_size
        if existing_bytes > 0:
            headers["Range"] = f"bytes={existing_bytes}-"
            mode = "ab"
            print(f"     Resuming from byte {existing_bytes} ({existing_bytes / (1024*1024):.1f} MB)...", flush=True)

    session = requests.Session()
    response = session.get(url, headers=headers, stream=True, timeout=60)
    
    if response.status_code not in (200, 206):
        # If range request failed (416), start from scratch
        if response.status_code == 416:
            part_file.unlink(missing_ok=True)
            existing_bytes = 0
            headers.pop("Range", None)
            mode = "wb"
            response = session.get(url, headers=headers, stream=True, timeout=60)
        else:
            raise RuntimeError(f"HTTP Error {response.status_code} for {url}")

    total_size = int(response.headers.get("content-length", 0)) + existing_bytes
    total_mb = total_size / (1024 * 1024)
    print(f"     Total Size: {total_mb:.1f} MB ({total_size / (1024**3):.2f} GB)", flush=True)

    start_time = time.time()
    last_print = 0
    downloaded = existing_bytes

    with open(part_file, mode) as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
            if not chunk:
                continue
            f.write(chunk)
            downloaded += len(chunk)

            now = time.time()
            if now - last_print >= 5:  # Log every 5 seconds
                elapsed = now - start_time
                speed_mb = (downloaded - existing_bytes) / (1024 * 1024) / max(elapsed, 0.1)
                percent = (downloaded / total_size) * 100 if total_size > 0 else 0
                print(f"     [{percent:5.1f}%] {downloaded / (1024*1024):.1f}/{total_mb:.1f} MB @ {speed_mb:.1f} MB/s", flush=True)
                last_print = now

    part_file.rename(target)
    final_size_gb = target.stat().st_size / (1024**3)
    print(f"[DONE] {name} successfully downloaded! ({final_size_gb:.2f} GB)\n", flush=True)

def main():
    print("=" * 75)
    print("FLUX.1 DEV Q4 GGUF MODEL COMPONENT DOWNLOADER")
    print("=" * 75)
    for item in FILES_TO_DOWNLOAD:
        download_file(item)
    print("=" * 75)
    print("ALL FLUX.1 DEV Q4 GGUF COMPONENTS READY ON DISK!")
    print("=" * 75)

if __name__ == "__main__":
    main()
