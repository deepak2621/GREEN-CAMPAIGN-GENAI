"""
Accuracy Test Suite for Green Campaign AI.
Directly executes all 6 required campaign accuracy tests:
TEST 1: Save Water (Water tap, water droplet, water-saving action)
TEST 2: Save Electricity (Light switches, efficient appliances, electricity conservation)
TEST 3: Renewable Energy (Solar panels, wind turbines, clean energy infrastructure)
TEST 4: Plastic Pollution (Plastic waste, polluted oceans, responsible plastic reduction)
TEST 5: Waste Management (Recycling bins, waste segregation, responsible disposal)
TEST 6: Plant More Trees (Tree planting, green spaces, environmental restoration)

Generates real diffusion images for each test, verifies prompt relevance,
validates output PNG with Pillow, and handles IP cool-down timing safely.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
from PIL import Image

BASE_URL = "http://127.0.0.1:5000"

TEST_CASES = [
    {
        "id": 1,
        "name": "TEST 1: Save Water",
        "payload": {
            "campaign_title": "Save Water",
            "description": "Encourage people to conserve water by turning off taps and reducing unnecessary water usage.",
            "category": "Water Conservation",
            "image_style": "3D Illustration",
            "target_audience": "Students",
            "aspect_ratio": "1:1",
            "seed": 100101
        },
        "expected_focal_tokens": ["water droplet", "tap", "water", "faucet"],
        "expected_negative_exclusions": ["solar panels", "wind turbines"]
    },
    {
        "id": 2,
        "name": "TEST 2: Save Electricity",
        "payload": {
            "campaign_title": "Save Electricity",
            "description": "Turn off unused room lights and unplug idle standby power electronics to save home energy.",
            "category": "Energy Conservation",
            "image_style": "Realistic Photography",
            "target_audience": "Households",
            "aspect_ratio": "1:1",
            "seed": 200202
        },
        "expected_focal_tokens": ["light switch", "led bulb", "electricity", "energy"],
        "expected_negative_exclusions": ["water drops", "faucet"]
    },
    {
        "id": 3,
        "name": "TEST 3: Renewable Energy",
        "payload": {
            "campaign_title": "Renewable Energy",
            "description": "Transition homes and cities to clean rooftop solar panels and wind turbines for zero emissions.",
            "category": "Renewable Energy",
            "image_style": "Digital Art",
            "target_audience": "General Public",
            "aspect_ratio": "1:1",
            "seed": 300303
        },
        "expected_focal_tokens": ["solar", "wind turbine", "photovoltaic", "clean energy"],
        "expected_negative_exclusions": ["oil rigs", "coal plants", "faucets"]
    },
    {
        "id": 4,
        "name": "TEST 4: Plastic Pollution",
        "payload": {
            "campaign_title": "Stop Plastic Pollution",
            "description": "Protect oceans and marine wildlife by banning single-use plastic bottles and cleaning coastlines.",
            "category": "Pollution Control",
            "image_style": "3D Illustration",
            "target_audience": "General Public",
            "aspect_ratio": "1:1",
            "seed": 400404
        },
        "expected_focal_tokens": ["plastic", "ocean", "marine", "cleanup"],
        "expected_negative_exclusions": ["toxic dump", "heavy industrial"]
    },
    {
        "id": 5,
        "name": "TEST 5: Waste Management",
        "payload": {
            "campaign_title": "Responsible Waste Management",
            "description": "Teach communities proper waste segregation using color-coded recycling bins and organic composting.",
            "category": "Waste Management",
            "image_style": "Educational Infographic Illustration",
            "target_audience": "Students",
            "aspect_ratio": "1:1",
            "seed": 500505
        },
        "expected_focal_tokens": ["recycling", "sorting", "bins", "compost"],
        "expected_negative_exclusions": ["wind farms", "solar fields"]
    },
    {
        "id": 6,
        "name": "TEST 6: Plant More Trees",
        "payload": {
            "campaign_title": "Plant More Trees",
            "description": "Community tree planting movement to restore green spaces, clean city air, and nourish urban soil.",
            "category": "Sustainable Living",
            "image_style": "Cartoon Illustration",
            "target_audience": "Children",
            "aspect_ratio": "1:1",
            "seed": 600606
        },
        "expected_focal_tokens": ["tree", "sapling", "soil", "planting"],
        "expected_negative_exclusions": ["heavy industrial", "highway traffic"]
    }
]

def wait_for_cooldown():
    """Polls backend cooldown until ready for next generation."""
    while True:
        try:
            req = urllib.request.Request(f"{BASE_URL}/api/cooldown")
            with urllib.request.urlopen(req) as res:
                data = json.loads(res.read().decode())
                remaining = data.get("cooldown_remaining", 0)
                if remaining <= 0:
                    return
                print(f"      [Cooldown] Waiting {remaining}s for free IP slot...", flush=True)
                time.sleep(min(remaining + 1, 10))
        except Exception as e:
            print(f"      [Cooldown Check Warning] {e}. Waiting 5s...", flush=True)
            time.sleep(5)

def run_accuracy_tests():
    print("=" * 80)
    print("GREEN CAMPAIGN AI - 6-CATEGORY ACCURACY & SEMANTIC RELEVANCE TEST SUITE")
    print("=" * 80)

    results = []

    for test in TEST_CASES:
        print(f"\n---> Executing {test['name']}")
        print(f"     Theme: '{test['payload']['campaign_title']}' | Category: '{test['payload']['category']}' | Style: '{test['payload']['image_style']}'")
        
        # 1. First test preview prompt to verify 10-point structure
        preview_req = urllib.request.Request(
            f"{BASE_URL}/api/preview-prompt",
            data=json.dumps(test["payload"]).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(preview_req) as res:
            p_data = json.loads(res.read().decode())["data"]
            generated_prompt = p_data["prompt"]
            negative_prompt = p_data["negative_prompt"]

        # Check expected focal tokens in prompt
        matched_tokens = [tok for tok in test["expected_focal_tokens"] if tok in generated_prompt.lower()]
        matched_exclusions = [ex for ex in test["expected_negative_exclusions"] if ex in negative_prompt.lower()]
        
        print(f"     Prompt Check: Matched focal tokens {matched_tokens} / {test['expected_focal_tokens']}")
        print(f"     Negative Check: Matched exclusions {matched_exclusions} / {test['expected_negative_exclusions']}")
        
        if not matched_tokens:
            print("     [FAIL] Prompt did not contain required semantic focal tokens!")
            sys.exit(1)

        # 2. Wait for IP cool-down if necessary
        wait_for_cooldown()

        # 3. Generate genuine image via /api/generate
        print("     Dispatching real diffusion generation request to backend...")
        success = False
        gen_data = None
        for attempt in range(5):
            try:
                gen_req = urllib.request.Request(
                    f"{BASE_URL}/api/generate",
                    data=json.dumps(test["payload"]).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(gen_req, timeout=90) as res:
                    body = json.loads(res.read().decode())
                    if body.get("success"):
                        gen_data = body["data"]
                        success = True
                        break
            except urllib.error.HTTPError as he:
                err_body = he.read().decode()
                try:
                    err_json = json.loads(err_body)
                    retry_sec = err_json.get("retry_after", 35)
                except Exception:
                    retry_sec = 35

                if he.code in (429, 402):
                    print(f"     [429 RateLimit] Cooldown active. Waiting {retry_sec + 2}s...", flush=True)
                    time.sleep(retry_sec + 2)
                elif he.code == 503:
                    print("     [503 Busy] Service busy. Retrying in 4s...", flush=True)
                    time.sleep(4)
                else:
                    print(f"     [Error {he.code}] {err_body}")
                    break
            except Exception as e:
                print(f"     [Network error] {e}. Retrying in 3s...")
                time.sleep(3)

        if not success or not gen_data:
            print(f"     [FAIL] Image generation failed for {test['name']}")
            sys.exit(1)

        # 4. Validate saved image on disk with Pillow
        img_path = gen_data["file_path"]
        print(f"     Image received! Checking disk file: {img_path}")
        if not os.path.isfile(img_path):
            print(f"     [FAIL] File {img_path} not found on disk!")
            sys.exit(1)

        with Image.open(img_path) as img:
            format_ok = img.format == "PNG"
            size_ok = img.size == (1024, 1024)
            print(f"     Pillow Validation: Format={img.format} (Expected PNG), Size={img.size} (Expected (1024, 1024))")
            if not format_ok or not size_ok:
                print("     [FAIL] Pillow validation failed!")
                sys.exit(1)

        print(f"     [PASS] {test['name']} successfully generated and verified!")
        results.append({
            "test_id": test["id"],
            "name": test["name"],
            "theme": test["payload"]["campaign_title"],
            "category": test["payload"]["category"],
            "style": test["payload"]["image_style"],
            "filename": gen_data["filename"],
            "dimensions": f"{gen_data['width']}x{gen_data['height']}",
            "file_size": f"{gen_data['file_size'] // 1024} KB",
            "matched_focal_tokens": matched_tokens,
            "prompt_snippet": gen_data["generated_prompt"][:180] + "..."
        })

    print("\n" + "=" * 80)
    print("ALL 6 ACCURACY AND SEMANTIC RELEVANCE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    for r in results:
        print(f"[{r['test_id']}/6] {r['name']}")
        print(f"      Theme: '{r['theme']}' | Category: '{r['category']}'")
        print(f"      Output: {r['filename']} ({r['dimensions']}, {r['file_size']})")
        print(f"      Focal Anchors: {r['matched_focal_tokens']}")
        print(f"      Prompt: {r['prompt_snippet']}")
    print("=" * 80)

if __name__ == "__main__":
    run_accuracy_tests()
