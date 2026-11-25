r"""
Download script for SDXL Turbo FP16 from official Stability AI Hugging Face repo.
Target: C:\Users\deepa\ComfyUI\models\checkpoints\sd_xl_turbo_1.0_fp16.safetensors
"""

import os
import sys
import time
import requests
from pathlib import Path

MODEL_URL = "https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors"
TARGET_DIR = Path(r"C:\Users\deepa\ComfyUI\models\checkpoints")
TARGET_PATH = TARGET_DIR / "sd_xl_turbo_1.0_fp16.safetensors"
PART_PATH = TARGET_DIR / "sd_xl_turbo_1.0_fp16.safetensors.part"

def download():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    if TARGET_PATH.exists() and TARGET_PATH.stat().st_size >= 6900000000:
        print(f"[ALREADY INSTALLED] {TARGET_PATH.name} exists ({TARGET_PATH.stat().st_size / 1024**3:.2f} GB).")
        return

    print("=" * 80)
    print("DOWNLOADING SDXL TURBO 1.0 FP16 CHECKPOINT")
    print(f"URL: {MODEL_URL}")
    print(f"Target: {TARGET_PATH}")
    print("=" * 80)

    resume_bytes = PART_PATH.stat().st_size if PART_PATH.exists() else 0
    headers = {}
    mode = "wb"
    if resume_bytes > 0:
        headers["Range"] = f"bytes={resume_bytes}-"
        mode = "ab"
        print(f"Resuming download from byte {resume_bytes} ({resume_bytes / 1024**2:.1f} MB)...")

    response = requests.get(MODEL_URL, headers=headers, stream=True, timeout=30)
    if response.status_code not in (200, 206):
        raise RuntimeError(f"Download failed with HTTP {response.status_code}: {response.text[:200]}")

    total_size = int(response.headers.get("Content-Length", 0)) + (resume_bytes if response.status_code == 206 else 0)
    downloaded = resume_bytes
    start_time = time.time()
    last_print = 0

    with open(PART_PATH, mode) as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                now = time.time()
                if now - last_print >= 3:
                    pct = (downloaded / total_size * 100) if total_size else 0
                    speed_mb = (downloaded - resume_bytes) / (now - start_time) / 1024**2
                    print(f"  [{pct:5.1f}%] {downloaded / 1024**2:6.1f} / {total_size / 1024**2:6.1f} MB @ {speed_mb:.1f} MB/s", flush=True)
                    last_print = now

    PART_PATH.rename(TARGET_PATH)
    final_size = TARGET_PATH.stat().st_size
    print("=" * 80)
    print(f"[DOWNLOAD COMPLETE] Saved to: {TARGET_PATH}")
    print(f"Final Size: {final_size / 1024**3:.2f} GB ({final_size} bytes)")
    print("=" * 80)

if __name__ == "__main__":
    download()
