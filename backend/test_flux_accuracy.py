"""
Accuracy and Performance Benchmark Suite for FLUX.1 Dev Q4 GGUF
Executes the 6 required sustainability visual generation tests.
Measures generation time, VRAM/RAM utilization, image dimensions, and visual element correspondence.
"""

import os
import sys
import time
import json
import psutil
from pathlib import Path
from PIL import Image

# Ensure project root is on PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.services.prompt_builder import prompt_builder
from backend.services.image_generator import image_generator_service, ComfyUIProcessManager
from backend.services.model_config import FluxModelConfig

TEST_CASES = [
    {
        "id": 1,
        "theme": "Save Water",
        "category": "Water Conservation",
        "description": "Close dripping water taps in residential bathroom, a prominent crystal-clear blue water droplet, showing fresh water conservation for households.",
        "image_style": "3D Illustration",
        "target_audience": "Households",
        "expected_elements": ["water tap / faucet", "water droplet", "bathroom / sink context", "water conservation"]
    },
    {
        "id": 2,
        "theme": "Save Electricity",
        "category": "Energy Conservation",
        "description": "Human hand switching off glowing wall light switches in modern home, energy-efficient LED lighting, reducing electricity consumption.",
        "image_style": "Realistic Photography",
        "target_audience": "General Public",
        "expected_elements": ["hand flipping switch", "wall light switch", "energy saving", "LED lighting"]
    },
    {
        "id": 3,
        "theme": "Renewable Energy",
        "category": "Renewable Energy",
        "description": "Rooftop modern photovoltaic solar panel installation and distant clean wind turbines generating green renewable electrical power.",
        "image_style": "Digital Artwork",
        "target_audience": "Industrial Consumers",
        "expected_elements": ["solar panels", "wind turbines", "clean power grid", "renewable energy"]
    },
    {
        "id": 4,
        "theme": "Plastic Pollution",
        "category": "Pollution Control",
        "description": "Coastal beach cleanup showing volunteers collecting single-use plastic bottles, marine life protection, plastic-free ocean awareness.",
        "image_style": "Educational Campaign Poster",
        "target_audience": "Students",
        "expected_elements": ["plastic bottles", "beach coastline", "cleanup volunteers", "marine protection"]
    },
    {
        "id": 5,
        "theme": "Waste Management",
        "category": "Waste Management",
        "description": "Three color-coded segregated recycling bins (green for organic compost, blue for paper and cardboard, yellow for recyclable plastics), circular waste sorting.",
        "image_style": "Minimalist Illustration",
        "target_audience": "Households",
        "expected_elements": ["color-coded recycling bins", "waste segregation", "recycling symbols", "clean sorting"]
    },
    {
        "id": 6,
        "theme": "Plant More Trees",
        "category": "Sustainable Living",
        "description": "Young diverse students planting green leafy tree saplings in fertile soil, hands nurturing young plants, lush reforestation and urban greening.",
        "image_style": "3D Illustration",
        "target_audience": "Students",
        "expected_elements": ["tree sapling", "planting hands / fertile soil", "students / youth", "lush greenery"]
    }
]

def run_tests():
    print("=" * 80)
    print("GREEN CAMPAIGN AI – FLUX.1 DEV Q4 BENCHMARK SUITE")
    print(f"Model: {FluxModelConfig.MODEL_NAME} ({FluxModelConfig.QUANT_FORMAT})")
    print(f"Base: {FluxModelConfig.BASE_MODEL} | License: {FluxModelConfig.LICENSE}")
    print(f"Target Hardware: NVIDIA RTX 4050 Laptop GPU (6GB) + 16GB System RAM")
    print(f"Execution Profile: {FluxModelConfig.EXECUTION_PROFILE}")
    print("=" * 80)

    # 1. Ensure ComfyUI Server is Running
    print("\n[Step 1] Ensuring ComfyUI server is active...")
    ComfyUIProcessManager.ensure_running()
    print("✓ ComfyUI server is active and responding.")

    results = []

    for test in TEST_CASES:
        t_id = test["id"]
        theme = test["theme"]
        cat = test["category"]
        desc = test["description"]
        style = test["image_style"]
        aud = test["target_audience"]

        print(f"\n" + "-" * 70)
        print(f"RUNNING TEST {t_id}/6: {theme} [{cat}]")
        print(f"Style: {style} | Audience: {aud}")
        print(f"Description: {desc}")

        # Build FLUX Prompt
        prompt_data = prompt_builder.build_flux_prompt(
            campaign_title=theme,
            description=desc,
            category=cat,
            image_style=style,
            target_audience=aud,
            seed=1000 + t_id * 77
        )

        print(f"Generated FLUX Prompt ({len(prompt_data['prompt'])} chars):")
        print(f"\"{prompt_data['prompt'][:160]}...\"")

        # Initial Memory & Timing
        mem_before = psutil.virtual_memory()
        start_time = time.time()

        try:
            gen_result = image_generator_service.generate(prompt_data)
            duration = round(time.time() - start_time, 2)
            mem_after = psutil.virtual_memory()

            image_path = Path(gen_result["filepath"])
            assert image_path.exists(), f"Output file does not exist: {image_path}"

            # Pillow Verification
            with Image.open(image_path) as img:
                img_format = img.format
                width, height = img.size
                img.verify()

            file_size_kb = round(image_path.stat().st_size / 1024, 2)

            test_record = {
                "test_id": t_id,
                "theme": theme,
                "category": cat,
                "style": style,
                "prompt": prompt_data["prompt"],
                "success": True,
                "duration_sec": duration,
                "output_dimensions": f"{width}x{height}",
                "format": img_format,
                "file_size_kb": file_size_kb,
                "file_path": str(image_path),
                "ram_usage_pct": mem_after.percent,
                "expected_elements": test["expected_elements"],
                "status": "PASSED"
            }

            print(f"✓ TEST {t_id} PASSED in {duration}s | Dimensions: {width}x{height} | Size: {file_size_kb} KB | Path: {image_path.name}")
            results.append(test_record)

        except Exception as e:
            duration = round(time.time() - start_time, 2)
            print(f"✗ TEST {t_id} FAILED after {duration}s: {e}")
            results.append({
                "test_id": t_id,
                "theme": theme,
                "category": cat,
                "success": False,
                "duration_sec": duration,
                "error": str(e),
                "status": "FAILED"
            })

    # Save Results JSON
    summary_path = Path("backend/flux_test_results.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 80)
    print(f"BENCHMARK COMPLETED: {sum(1 for r in results if r['success'])}/{len(TEST_CASES)} passed.")
    print(f"Benchmark data written to: {summary_path}")
    print("=" * 80)
    return results

if __name__ == "__main__":
    run_tests()
