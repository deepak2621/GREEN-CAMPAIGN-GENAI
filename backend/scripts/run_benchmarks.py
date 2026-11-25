"""
Benchmark test suite for Green Campaign AI with SDXL Turbo.
Tests 6 campaign categories, verifies sub-10-second generation latency,
validates image format with Pillow, and tests history and download endpoints.
"""

import os
import sys
import time
import requests
from PIL import Image

BASE_URL = "http://127.0.0.1:5000/api"

BENCHMARK_CAMPAIGNS = [
    {
        "name": "1. Save Water",
        "payload": {
            "campaign_title": "Save Water",
            "description": "Encourage households to turn off taps and save clean water.",
            "category": "Water Conservation",
            "image_style": "3D Illustration",
            "target_audience": "Households",
            "aspect_ratio": "1:1"
        }
    },
    {
        "name": "2. Save Electricity",
        "payload": {
            "campaign_title": "Save Electricity",
            "description": "Turn off switches and unplug standby electronics to lower home energy consumption.",
            "category": "Energy Conservation",
            "image_style": "3D Illustration",
            "target_audience": "Households",
            "aspect_ratio": "1:1"
        }
    },
    {
        "name": "3. Clean Renewable Energy",
        "payload": {
            "campaign_title": "Clean Renewable Energy",
            "description": "Harnessing rooftop solar panels and clean wind turbines to power zero-emission cities.",
            "category": "Renewable Energy",
            "image_style": "Realistic Photography",
            "target_audience": "General Public",
            "aspect_ratio": "1:1"
        }
    },
    {
        "name": "4. Stop Plastic Pollution",
        "payload": {
            "campaign_title": "Stop Plastic Pollution",
            "description": "Clear plastic waste from coastlines and protect marine ecosystems and sea turtles.",
            "category": "Pollution Control",
            "image_style": "3D Illustration",
            "target_audience": "Students",
            "aspect_ratio": "1:1"
        }
    },
    {
        "name": "5. Zero Waste Recycling",
        "payload": {
            "campaign_title": "Zero Waste Recycling",
            "description": "Sort recyclable materials into color-coded bins to build a circular economy.",
            "category": "Waste Management",
            "image_style": "Flat Vector Illustration",
            "target_audience": "General Public",
            "aspect_ratio": "1:1"
        }
    },
    {
        "name": "6. Plant More Trees",
        "payload": {
            "campaign_title": "Plant More Trees",
            "description": "Restore urban green spaces by planting and nurturing native tree saplings.",
            "category": "Sustainable Living",
            "image_style": "Educational Infographic Illustration",
            "target_audience": "Students",
            "aspect_ratio": "1:1"
        }
    }
]

def run_benchmarks():
    print("=" * 85)
    print("GREEN CAMPAIGN AI – SDXL TURBO 6-CATEGORY BENCHMARK SUITE")
    print("Model: SDXL Turbo 1.0 FP16 | Steps: 4 | CFG: 1.0 (guidance 0.0) | Resolution: 512x512")
    print("Speed Target: < 10.0 seconds per campaign visual")
    print("=" * 85)

    results = []

    for item in BENCHMARK_CAMPAIGNS:
        name = item["name"]
        payload = item["payload"]
        print(f"\n--- Testing: {name} ({payload['category']} / {payload['image_style']}) ---")

        t0 = time.time()
        res = requests.post(f"{BASE_URL}/generate", json=payload, timeout=60)
        t1 = time.time()
        duration = round(t1 - t0, 2)

        if res.status_code != 200:
            print(f"  [ERROR] HTTP {res.status_code}: {res.text[:200]}")
            results.append({
                "name": name,
                "category": payload["category"],
                "success": False,
                "duration": duration,
                "error": res.text
            })
            continue

        data = res.json()["data"]
        filename = data["filename"]
        file_path = data["file_path"]
        image_url = data["image_url"]
        download_url = data["download_url"]
        seed = data["seed"]
        prompt = data["generated_prompt"]

        # Validate with Pillow
        img = Image.open(file_path)
        img_format = img.format
        img_size = img.size
        img_mode = img.mode
        file_bytes = os.path.getsize(file_path)

        # Verify download endpoint
        dl_res = requests.get(f"http://127.0.0.1:5000{download_url}", timeout=10)
        dl_ok = dl_res.status_code == 200 and len(dl_res.content) == file_bytes

        # Save to history
        hist_payload = {
            "campaign_title": payload["campaign_title"],
            "description": payload["description"],
            "category": payload["category"],
            "image_style": payload["image_style"],
            "target_audience": payload["target_audience"],
            "aspect_ratio": payload["aspect_ratio"],
            "generated_prompt": prompt,
            "negative_prompt": data.get("negative_prompt", ""),
            "image_url": image_url,
            "download_url": download_url,
            "filename": filename,
            "image_path": file_path,
            "seed": seed,
            "width": img_size[0],
            "height": img_size[1],
            "file_size": file_bytes
        }
        hist_res = requests.post(f"{BASE_URL}/history", json=hist_payload, timeout=10)
        hist_ok = hist_res.status_code in (200, 201)

        speed_pass = duration < 10.0
        status_tag = "[PASS <10s]" if speed_pass else "[FAIL >10s]"

        print(f"  Status: SUCCESS {status_tag}")
        print(f"  Duration: {duration:.2f} s")
        print(f"  Resolution: {img_size[0]}x{img_size[1]} ({img_format}, {img_mode})")
        print(f"  File size: {file_bytes / 1024:.1f} KB")
        print(f"  Image URL: {image_url}")
        print(f"  Download endpoint verified: {dl_ok}")
        print(f"  History saved: {hist_ok}")
        print(f"  Prompt Hero: {prompt[:90]}...")

        results.append({
            "name": name,
            "category": payload["category"],
            "success": True,
            "duration": duration,
            "speed_pass": speed_pass,
            "dimensions": f"{img_size[0]}x{img_size[1]}",
            "file_size_kb": round(file_bytes / 1024, 1),
            "filename": filename,
            "seed": seed,
            "download_ok": dl_ok,
            "history_ok": hist_ok
        })

    # Test history retrieval
    print("\n" + "=" * 85)
    print("TESTING HISTORY RETRIEVAL (/api/history)")
    all_hist = requests.get(f"{BASE_URL}/history").json()
    print(f"Total campaigns in history: {all_hist.get('count', 0)}")
    print("=" * 85)

    print("\nSUMMARY TABLE:")
    print(f"{'Campaign':<30} | {'Category':<22} | {'Time (s)':<10} | {'Status':<12} | {'File Size'}")
    print("-" * 88)
    for r in results:
        status_str = "PASS (<10s)" if r.get("speed_pass") else "FAIL"
        print(f"{r['name']:<30} | {r['category']:<22} | {r['duration']:<10.2f} | {status_str:<12} | {r.get('file_size_kb', 0)} KB")

    all_passed = all(r.get("success") and r.get("speed_pass") for r in results)
    print("=" * 85)
    print(f"FINAL BENCHMARK RESULT: {'ALL PASS (<10s TARGET MET)' if all_passed else 'SOME FAILED'}")
    print("=" * 85)

if __name__ == "__main__":
    run_benchmarks()
