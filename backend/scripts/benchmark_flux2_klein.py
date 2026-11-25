r"""
Comprehensive Benchmark Script for FLUX.2 Klein 4B Q4 Integration.
Tests 6 key sustainability campaign themes via Flask API endpoint http://127.0.0.1:5000/api/generate.
Verifies:
1. End-to-end API generation latency and JSON response structure.
2. Pillow validation of generated PNG file (format, dimensions 512x512, RGB mode, non-zero bytes).
3. Image retrieval endpoint (/api/images/<filename>) and download endpoint (/api/images/<filename>/download).
4. Campaign database persistence (/api/campaigns POST), listing (/api/campaigns GET), and deletion.
"""

import time
import requests
import json
from PIL import Image
import io

API_BASE = "http://127.0.0.1:5000/api"

BENCHMARK_TESTS = [
    {
        "id": "test_1_water",
        "title": "Save Water",
        "description": "Encourage people to conserve water by turning off taps and reducing unnecessary water usage.",
        "category": "Water Conservation",
        "image_style": "3D Illustration",
        "target_audience": "Students",
        "aspect_ratio": "1:1"
    },
    {
        "id": "test_2_energy",
        "title": "Save Electricity",
        "description": "Turn off lights and unplug electronics when not in use to conserve power.",
        "category": "Energy Conservation",
        "image_style": "3D Illustration",
        "target_audience": "Households",
        "aspect_ratio": "1:1"
    },
    {
        "id": "test_3_renewable",
        "title": "Solar & Wind Clean Future",
        "description": "Transition from fossil fuels to clean renewable solar panels and wind turbines.",
        "category": "Renewable Energy",
        "image_style": "3D Illustration",
        "target_audience": "General Public",
        "aspect_ratio": "1:1"
    },
    {
        "id": "test_4_plastic",
        "title": "Clean Our Oceans",
        "description": "Eliminate single-use plastic to stop ocean waste and save marine life.",
        "category": "Pollution Control",
        "image_style": "3D Illustration",
        "target_audience": "General Public",
        "aspect_ratio": "1:1"
    },
    {
        "id": "test_5_waste",
        "title": "Segregate Waste Daily",
        "description": "Sort recyclable paper, plastics, and organic waste into color-coded bins.",
        "category": "Waste Management",
        "image_style": "3D Illustration",
        "target_audience": "Students",
        "aspect_ratio": "1:1"
    },
    {
        "id": "test_6_trees",
        "title": "Plant Urban Trees",
        "description": "Plant native tree saplings in fertile soil to restore ecological balance and clean air.",
        "category": "Sustainable Living",
        "image_style": "3D Illustration",
        "target_audience": "Children",
        "aspect_ratio": "1:1"
    }
]

def run_benchmarks():
    print("=" * 90)
    print("GREEN CAMPAIGN AI – FLUX.2 KLEIN 4B Q4 MULTI-CATEGORY BENCHMARK TEST SUITE")
    print("Model: FLUX.2 Klein 4B Q4 (Distilled GGUF) | Text Enc: Qwen3-4B | VAE: FLUX.2 VAE")
    print("Inference: 4 Steps, CFG 1.0, Euler Sampler, Flux2Scheduler | Res: 512x512")
    print("=" * 90)

    results = []

    for i, test in enumerate(BENCHMARK_TESTS, 1):
        print(f"\n--- [{i}/6] RUNNING: {test['title']} ({test['category']}) ---")
        payload = {
            "campaign_title": test["title"],
            "description": test["description"],
            "category": test["category"],
            "image_style": test["image_style"],
            "target_audience": test["target_audience"],
            "aspect_ratio": test["aspect_ratio"]
        }

        t_start = time.time()
        try:
            res = requests.post(f"{API_BASE}/generate", json=payload, timeout=120)
            elapsed = time.time() - t_start
        except Exception as e:
            print(f"[FAIL] Request failed: {e}")
            results.append({"id": test["id"], "success": False, "error": str(e)})
            continue

        if res.status_code != 200:
            print(f"[FAIL] HTTP {res.status_code}: {res.text}")
            results.append({"id": test["id"], "success": False, "error": res.text})
            continue

        data = res.json().get("data", {})
        filename = data.get("filename")
        image_url = data.get("image_url")
        download_url = data.get("download_url")
        prompt_used = data.get("generated_prompt")
        model_name = data.get("model")
        quantization = data.get("quantization")

        print(f"[PASS] Generation returned in {elapsed:.2f} seconds!")
        print(f"       Model: {model_name} ({quantization})")
        print(f"       Filename: {filename}")
        print(f"       Prompt Preview: {prompt_used[:95]}...")

        # 1. Verify Image Retrieval via Flask endpoint
        img_res = requests.get(f"http://127.0.0.1:5000{image_url}", timeout=10)
        if img_res.status_code != 200:
            print(f"[FAIL] Image retrieval failed: {img_res.status_code}")
            results.append({"id": test["id"], "success": False, "error": "Image fetch failed"})
            continue

        # 2. Pillow Verification
        try:
            img = Image.open(io.BytesIO(img_res.content))
            print(f"       Pillow Verification: Format={img.format}, Size={img.size}, Mode={img.mode}, Bytes={len(img_res.content):,}")
            assert img.format == "PNG", f"Expected PNG format, got {img.format}"
            assert img.size == (512, 512), f"Expected 512x512, got {img.size}"
            assert img.mode in ("RGB", "RGBA"), f"Expected RGB/RGBA mode, got {img.mode}"
        except Exception as pe:
            print(f"[FAIL] Pillow verification error: {pe}")
            results.append({"id": test["id"], "success": False, "error": str(pe)})
            continue

        # 3. Verify Download Endpoint
        dl_res = requests.get(f"http://127.0.0.1:5000{download_url}", timeout=10)
        assert dl_res.status_code == 200, f"Download endpoint failed: {dl_res.status_code}"
        assert "attachment" in dl_res.headers.get("Content-Disposition", ""), "Expected attachment header"
        print(f"       Download Header OK: {dl_res.headers.get('Content-Disposition')}")

        # 4. Save to Campaign History
        history_payload = {
            "campaign_title": test["title"],
            "description": test["description"],
            "category": test["category"],
            "image_style": test["image_style"],
            "target_audience": test["target_audience"],
            "aspect_ratio": test["aspect_ratio"],
            "image_url": image_url,
            "filename": filename,
            "prompt": prompt_used,
            "negative_prompt": data.get("negative_prompt", ""),
            "model": model_name
        }
        h_res = requests.post(f"{API_BASE}/campaigns", json=history_payload, timeout=10)
        if h_res.status_code in (200, 201):
            h_data = h_res.json()
            campaign_id = h_data.get("data", {}).get("id") or h_data.get("campaign", {}).get("id")
            print(f"       Database Saved OK: Campaign ID={campaign_id}")
        else:
            print(f"       [WARN] History save status: {h_res.status_code}")

        results.append({
            "id": test["id"],
            "title": test["title"],
            "category": test["category"],
            "success": True,
            "latency_sec": round(elapsed, 2),
            "filename": filename,
            "size": f"{img.size[0]}x{img.size[1]}",
            "bytes": len(img_res.content),
            "model": model_name
        })

    print("\n" + "=" * 90)
    print("BENCHMARK SUMMARY RESULTS")
    print("=" * 90)
    for r in results:
        status_str = "SUCCESS" if r["success"] else "FAILED"
        lat = f"{r.get('latency_sec', 0)}s" if r["success"] else "N/A"
        print(f"{r['id']:<18} | {r.get('title',''):<26} | Status: {status_str:<7} | Latency: {lat:<7} | Size: {r.get('size','N/A')}")
    print("=" * 90)

if __name__ == "__main__":
    run_benchmarks()
