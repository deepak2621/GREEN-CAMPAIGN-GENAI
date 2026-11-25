import requests
import time
import os
from PIL import Image

payload = {
    "campaign_title": "Save Water",
    "description": "Encourage people to conserve water by turning off taps and reducing unnecessary water usage.",
    "category": "Water Conservation",
    "image_style": "3D Illustration",
    "target_audience": "Students",
    "aspect_ratio": "1:1"
}

print("=" * 80)
print("TEST 1: SAVE WATER (WATER CONSERVATION) WITH SDXL TURBO")
print("Target: < 10 seconds total latency, 512x512 resolution, 4 steps")
print("=" * 80)

t0 = time.time()
res = requests.post("http://127.0.0.1:5000/api/generate", json=payload, timeout=120)
t1 = time.time()
elapsed = t1 - t0

print(f"HTTP Status: {res.status_code}")
print(f"Total API Latency: {elapsed:.2f} seconds")

if res.status_code == 200:
    resp_json = res.json()
    data = resp_json.get("data", {})
    filename = data.get("filename")
    file_path = data.get("file_path")
    seed = data.get("seed")
    image_url = data.get("image_url")
    print("\n[SUCCESS] Image generated successfully!")
    print(f"Filename: {filename}")
    print(f"Filepath: {file_path}")
    print(f"Image URL: {image_url}")
    print(f"Seed: {seed}")
    
    # Verify with Pillow
    img = Image.open(file_path)
    print(f"Pillow Verification: format={img.format}, size={img.size}, mode={img.mode}")
    print(f"File size on disk: {os.path.getsize(file_path) / 1024:.1f} KB")

    # Also test saving to history
    hist_payload = {
        "campaign_title": payload["campaign_title"],
        "description": payload["description"],
        "category": payload["category"],
        "image_style": payload["image_style"],
        "target_audience": payload["target_audience"],
        "aspect_ratio": payload["aspect_ratio"],
        "prompt": data.get("generated_prompt"),
        "negative_prompt": data.get("negative_prompt"),
        "image_url": image_url,
        "filename": filename,
        "file_path": file_path,
        "image_path": file_path,
        "seed": seed,
        "width": data.get("width"),
        "height": data.get("height"),
        "file_size": data.get("file_size")
    }
    hist_res = requests.post("http://127.0.0.1:5000/api/history", json=hist_payload)
    print(f"Save to history status: {hist_res.status_code}")
else:
    print("\n[FAILED] Generation error:")
    print(res.text)
