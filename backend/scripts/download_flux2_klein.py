r"""
Download script for FLUX.2 Klein 4B components:
1. FLUX.2 Klein 4B Q4_K_M GGUF (moonbox-dev/FLUX.2-klein-4B-GGUF) -> ComfyUI/models/unet/
2. Qwen3-4B Text Encoder (Comfy-Org/flux2-klein) -> ComfyUI/models/clip/
3. FLUX.2 VAE (Comfy-Org/flux2-dev) -> ComfyUI/models/vae/
"""

import os
import sys
import time
import requests
from pathlib import Path

DOWNLOAD_ITEMS = [
    {
        "name": "FLUX.2 Klein 4B Q4_K_M GGUF (Transformer)",
        "url": "https://huggingface.co/moonbox-dev/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q4_K_M.gguf",
        "target_dir": Path(r"C:\Users\deepa\ComfyUI\models\unet"),
        "filename": "flux-2-klein-4b-Q4_K_M.gguf",
        "expected_bytes": 2292294208
    },
    {
        "name": "FLUX.2 VAE",
        "url": "https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors",
        "target_dir": Path(r"C:\Users\deepa\ComfyUI\models\vae"),
        "filename": "flux2-vae.safetensors",
        "expected_bytes": 336213556
    },
    {
        "name": "Qwen3-4B Text Encoder",
        "url": "https://huggingface.co/Comfy-Org/flux2-klein/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors",
        "target_dir": Path(r"C:\Users\deepa\ComfyUI\models\clip"),
        "filename": "qwen_3_4b.safetensors",
        "expected_bytes": 8044982048
    }
]

def download_file(item):
    name = item["name"]
    url = item["url"]
    target_dir = item["target_dir"]
    filename = item["filename"]
    expected_bytes = item["expected_bytes"]

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    part_path = target_dir / f"{filename}.part"

    if target_path.exists() and target_path.stat().st_size >= (expected_bytes - 1000):
        print(f"[ALREADY EXISTS] {name} is installed at {target_path} ({target_path.stat().st_size / 1024**3:.2f} GB)")
        return

    print("=" * 80)
    print(f"DOWNLOADING: {name}")
    print(f"URL: {url}")
    print(f"Target: {target_path}")
    print("=" * 80)

    resume_bytes = part_path.stat().st_size if part_path.exists() else 0
    headers = {}
    mode = "wb"
    if resume_bytes > 0:
        headers["Range"] = f"bytes={resume_bytes}-"
        mode = "ab"
        print(f"Resuming download from byte {resume_bytes} ({resume_bytes / 1024**2:.1f} MB)...")

    response = requests.get(url, headers=headers, stream=True, timeout=30)
    if response.status_code not in (200, 206):
        raise RuntimeError(f"Download failed with HTTP {response.status_code}: {response.text[:200]}")

    total_size = int(response.headers.get("Content-Length", 0)) + (resume_bytes if response.status_code == 206 else 0)
    downloaded = resume_bytes
    start_time = time.time()
    last_print = 0

    with open(part_path, mode) as f:
        for chunk in response.iter_content(chunk_size=2 * 1024 * 1024):  # 2MB chunks
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                now = time.time()
                if now - last_print >= 3:
                    pct = (downloaded / total_size * 100) if total_size else 0
                    speed_mb = (downloaded - resume_bytes) / (now - start_time) / 1024**2
                    print(f"  [{pct:5.1f}%] {downloaded / 1024**2:6.1f} / {total_size / 1024**2:6.1f} MB @ {speed_mb:.1f} MB/s", flush=True)
                    last_print = now

    part_path.rename(target_path)
    final_size = target_path.stat().st_size
    print(f"[COMPLETE] Saved {filename} ({final_size / 1024**3:.2f} GB)")

def main():
    print("=" * 80)
    print("FLUX.2 KLEIN 4B COMPONENT INSTALLER")
    print("=" * 80)
    for item in DOWNLOAD_ITEMS:
        download_file(item)
    print("\nALL FLUX.2 KLEIN 4B COMPONENTS INSTALLED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
