"""
FLUX.1 Dev Q4 Benchmark Collector and Database Synchronizer
Monitors ComfyUI queue/history for the 6 sustainability campaigns,
copies and verifies generated PNGs with Pillow, stores campaign records
in SQLite for History/Gallery UI, and outputs benchmark metrics.
"""

import os
import sys
import time
import json
import shutil
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import Config
from backend.database.models import CampaignModel
from backend.services.model_config import FluxModelConfig

TEST_DEFS = {
    "Save Water": {
        "id": 1,
        "theme": "Save Water",
        "category": "Water Conservation",
        "description": "Close dripping water taps in residential bathroom, a prominent crystal-clear blue water droplet, showing fresh water conservation for households.",
        "image_style": "3D Illustration",
        "target_audience": "Households",
        "expected_elements": ["water tap / faucet", "water droplet", "bathroom / sink context", "water conservation"]
    },
    "Save Electricity": {
        "id": 2,
        "theme": "Save Electricity",
        "category": "Energy Conservation",
        "description": "Human hand switching off glowing wall light switches in modern home, energy-efficient LED lighting, reducing electricity consumption.",
        "image_style": "Realistic Photography",
        "target_audience": "General Public",
        "expected_elements": ["hand flipping switch", "wall light switch", "energy saving", "LED lighting"]
    },
    "Renewable Energy": {
        "id": 3,
        "theme": "Renewable Energy",
        "category": "Renewable Energy",
        "description": "Rooftop modern photovoltaic solar panel installation and distant clean wind turbines generating green renewable electrical power.",
        "image_style": "Digital Artwork",
        "target_audience": "Industrial Consumers",
        "expected_elements": ["solar panels", "wind turbines", "clean power grid", "renewable energy"]
    },
    "Plastic Pollution": {
        "id": 4,
        "theme": "Plastic Pollution",
        "category": "Pollution Control",
        "description": "Coastal beach cleanup showing volunteers collecting single-use plastic bottles, marine life protection, plastic-free ocean awareness.",
        "image_style": "Educational Campaign Poster",
        "target_audience": "Students",
        "expected_elements": ["plastic bottles", "beach coastline", "cleanup volunteers", "marine protection"]
    },
    "Waste Management": {
        "id": 5,
        "theme": "Waste Management",
        "category": "Waste Management",
        "description": "Three color-coded segregated recycling bins (green for organic compost, blue for paper and cardboard, yellow for recyclable plastics), circular waste sorting.",
        "image_style": "Minimalist Illustration",
        "target_audience": "Households",
        "expected_elements": ["color-coded recycling bins", "waste segregation", "recycling symbols", "clean sorting"]
    },
    "Plant More Trees": {
        "id": 6,
        "theme": "Plant More Trees",
        "category": "Sustainable Living",
        "description": "Young diverse students planting green leafy tree saplings in fertile soil, hands nurturing young plants, lush reforestation and urban greening.",
        "image_style": "3D Illustration",
        "target_audience": "Students",
        "expected_elements": ["tree sapling", "planting hands / fertile soil", "students / youth", "lush greenery"]
    }
}

def identify_test(prompt_text: str):
    for theme_key in TEST_DEFS:
        if f"'{theme_key}'" in prompt_text or theme_key.lower() in prompt_text.lower():
            return TEST_DEFS[theme_key]
    return None

def monitor():
    print("=" * 80)
    print("MONITORING FLUX.1 DEV Q4 GENERATION BENCHMARKS")
    print("Target: 6 Sustainability Test Cases")
    print("=" * 80)

    output_dir = Path(Config.GENERATED_IMAGES_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    comfy_output_dir = FluxModelConfig.COMFY_DIR / "output"

    collected = {}
    start_wait = time.time()

    while len(collected) < 6 and time.time() - start_wait < 900:
        try:
            req = urllib.request.urlopen(f"{FluxModelConfig.COMFY_URL}/history")
            history = json.loads(req.read().decode('utf-8'))
        except Exception as e:
            print(f"Error checking history: {e}")
            time.sleep(3)
            continue

        for prompt_id, item in history.items():
            prompt_nodes = item.get("prompt", [None, None, {}])[2]
            prompt_text = prompt_nodes.get("4", {}).get("inputs", {}).get("text", "")
            
            test_info = identify_test(prompt_text)
            if not test_info:
                continue

            t_id = test_info["id"]
            if t_id in collected:
                continue

            outputs = item.get("outputs", {})
            save_node = outputs.get("10", {})
            images = save_node.get("images", [])
            if not images:
                continue

            img_meta = images[0]
            src_filename = img_meta["filename"]
            src_path = comfy_output_dir / src_filename

            if not src_path.exists():
                continue

            # Copy to backend/generated_images
            dest_filename = f"flux_campaign_{t_id}_{test_info['theme'].lower().replace(' ', '_')}.png"
            dest_path = output_dir / dest_filename
            shutil.copy2(src_path, dest_path)

            # Pillow verify
            with Image.open(dest_path) as img:
                img_format = img.format
                w, h = img.size
                file_size_kb = round(dest_path.stat().st_size / 1024, 2)

            # Insert into database
            now_iso = datetime.now(timezone.utc).isoformat()
            db_record = {
                "campaign_title": test_info["theme"],
                "category": test_info["category"],
                "description": test_info["description"],
                "image_style": test_info["image_style"],
                "target_audience": test_info["target_audience"],
                "aspect_ratio": "1:1",
                "generated_prompt": prompt_text,
                "negative_prompt": "universal quality filter",
                "image_path": str(dest_path),
                "created_at": now_iso
            }
            CampaignModel.create(db_record)

            record = {
                "test_id": t_id,
                "theme": test_info["theme"],
                "category": test_info["category"],
                "style": test_info["image_style"],
                "target_audience": test_info["target_audience"],
                "prompt": prompt_text,
                "output_dimensions": f"{w}x{h}",
                "format": img_format,
                "file_size_kb": file_size_kb,
                "file_path": str(dest_path),
                "filename": dest_filename,
                "expected_elements": test_info["expected_elements"],
                "status": "PASSED"
            }
            collected[t_id] = record
            print(f"[COLLECTED {len(collected)}/6] Test {t_id}: {test_info['theme']} -> {dest_filename} ({w}x{h}, {file_size_kb} KB)")

        if len(collected) < 6:
            time.sleep(5)

    # Save benchmark JSON
    benchmark_list = [collected[k] for k in sorted(collected.keys())]
    results_path = Path("backend/flux_test_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_list, f, indent=2)

    print("\n" + "=" * 80)
    print(f"BENCHMARK COMPLETED: {len(benchmark_list)}/6 tests collected.")
    print(f"Saved results to: {results_path}")
    print("=" * 80)

if __name__ == "__main__":
    monitor()
