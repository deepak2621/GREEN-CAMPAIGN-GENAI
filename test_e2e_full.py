"""
Comprehensive End-to-End Verification Test for Green Campaign AI
Covers all 20 test points specified in the project improvement requirements.
"""

import os
import sys
import re
import time
from pathlib import Path
from PIL import Image

from backend.app import create_app
from backend.config import Config
from backend.database.models import CampaignModel
from backend.services.prompt_builder import build_prompt

def run_e2e_tests():
    print("=" * 75)
    print("GREEN CAMPAIGN AI - COMPREHENSIVE END-TO-END VERIFICATION SUITE")
    print("=" * 75)

    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    passed = 0
    total = 0

    def assert_test(condition, test_name):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"[PASS] {total:02d}. {test_name}")
        else:
            print(f"[FAIL] {total:02d}. {test_name}")
            sys.exit(1)

    # 1. Health check & backend availability
    res = client.get("/api/health")
    assert_test(res.status_code == 200 and res.get_json()["status"] == "healthy", "Backend /api/health endpoint reachable & healthy")

    # 2. Config endpoint returns complete categories, styles, audiences
    res = client.get("/api/config")
    cfg = res.get_json()
    assert_test(
        res.status_code == 200 and len(cfg["categories"]) == 7 and len(cfg["styles"]) == 6,
        "Backend /api/config returns complete metadata options"
    )

    # 3. Cooldown endpoint returns remaining cooldown
    res = client.get("/api/cooldown")
    assert_test(res.status_code == 200 and "cooldown_remaining" in res.get_json(), "Backend /api/cooldown endpoint reachable")

    # 4. Empty inputs rejected with 400 & ValidationError
    res = client.post("/api/generate", json={})
    assert_test(
        res.status_code == 400 and res.get_json()["error_type"] == "ValidationError",
        "Required-field validation rejects empty input with 400 ValidationError"
    )

    # 5. Form validation catches missing campaign title
    res = client.post("/api/generate", json={"category": "Water Conservation", "image_style": "3D Illustration"})
    assert_test(
        res.status_code == 400 and "campaign_title" in res.get_json()["errors"],
        "Form validation catches missing campaign title"
    )

    # 6. Form validation rejects invalid category
    res = client.post("/api/generate", json={
        "campaign_title": "Test",
        "description": "Test desc",
        "category": "InvalidCategory",
        "image_style": "3D Illustration",
        "target_audience": "General Public"
    })
    assert_test(
        res.status_code == 400 and "category" in res.get_json()["errors"],
        "Form validation rejects invalid category"
    )

    # 7. Missing API key produces clear configuration message
    orig_provider = Config.IMAGE_PROVIDER
    orig_token = Config.HF_TOKEN
    try:
        Config.IMAGE_PROVIDER = "huggingface"
        Config.HF_TOKEN = ""
        res = client.post("/api/generate", json={
            "campaign_title": "Solar Power",
            "description": "Clean rooftop solar",
            "category": "Renewable Energy",
            "image_style": "Realistic Photography",
            "target_audience": "Households"
        })
        assert_test(
            res.status_code == 422 and res.get_json()["error_type"] == "ConfigurationError",
            "Missing API key produces clear 422 ConfigurationError message"
        )
    finally:
        Config.IMAGE_PROVIDER = orig_provider
        Config.HF_TOKEN = orig_token

    # 8. Category relevance and negative exclusions in prompt builder
    p_water = build_prompt(
        theme="Save Water",
        description="Close running taps",
        category="Water Conservation",
        image_style="3D Illustration",
        target_audience="Students"
    )
    assert_test(
        "water droplet" in p_water["prompt"].lower() and "solar panels" in p_water["negative_prompt"].lower(),
        "Prompt builder injects category-specific visual focus and negative category exclusions"
    )

    # 9. Real AI Diffusion Generation and Pillow verification
    print("   -> Initiating real diffusion visual synthesis via AI engine...")
    gen_res = None
    for attempt in range(5):
        gen_res = client.post("/api/generate", json={
            "campaign_title": "Clean Solar Energy",
            "description": "Rooftop solar panels generating clean home electricity",
            "category": "Renewable Energy",
            "image_style": "Realistic Photography",
            "target_audience": "Households",
            "aspect_ratio": "1:1",
            "seed": 424242
        })
        if gen_res.status_code == 200:
            break
        elif gen_res.status_code in (429, 502) and "limit" in gen_res.get_json().get("message", "").lower():
            m = re.search(r"(\d+)s", gen_res.get_json().get("message", ""))
            wait_sec = (int(m.group(1)) + 5) if m else 35
            print(f"   -> Rate limit cool-down active. Waiting {wait_sec}s for free IP slot...")
            time.sleep(wait_sec)
        elif gen_res.status_code == 503:
            print("   -> Service busy (503). Retrying in 3s...")
            time.sleep(3)
        else:
            break

    assert_test(gen_res.status_code == 200, "Real AI diffusion image generation succeeds with HTTP 200")
    gen_data = gen_res.get_json()["data"]
    filename = gen_data["filename"]
    file_path = gen_data["file_path"]

    # 10. File exists on disk
    assert_test(os.path.isfile(file_path), "Generated image file exists on disk in generated_images")

    # 11. Image processed by Pillow as true 1024x1024 PNG
    with Image.open(file_path) as img:
        assert_test(img.format == "PNG" and img.size == (1024, 1024), "Image processed by Pillow as valid 1024x1024 PNG")

    # 12. Serves generated image correctly
    img_res = client.get(f"/api/images/{filename}")
    assert_test(img_res.status_code == 200 and img_res.mimetype == "image/png", "Image serving endpoint returns image/png")
    img_res.close()

    # 13. Download endpoint provides attachment Content-Disposition header
    dl_res = client.get(f"/api/images/{filename}/download")
    assert_test(
        dl_res.status_code == 200 and "attachment" in dl_res.headers.get("Content-Disposition", ""),
        "Download endpoint provides attachment Content-Disposition header"
    )
    dl_res.close()

    # 14. Seed preservation
    assert_test(gen_data.get("seed") == 424242, "Custom seed control accurately passed and returned in payload")

    # 15. Save to History
    save_res = client.post("/api/history", json={
        "campaign_title": "Clean Solar Energy",
        "description": "Rooftop solar panels generating clean home electricity",
        "category": "Renewable Energy",
        "image_style": "Realistic Photography",
        "target_audience": "Households",
        "aspect_ratio": "1:1",
        "generated_prompt": gen_data["generated_prompt"],
        "negative_prompt": gen_data["negative_prompt"],
        "image_path": file_path,
        "seed": 424242
    })
    assert_test(save_res.status_code == 201, "Campaign successfully saved to SQLite history")
    history_record = save_res.get_json()["data"]
    campaign_id = history_record["id"]

    # 16. Duplicate prevention avoids creating duplicate history records
    dup_res = client.post("/api/history", json={
        "campaign_title": "Clean Solar Energy",
        "description": "Rooftop solar panels generating clean home electricity",
        "category": "Renewable Energy",
        "image_style": "Realistic Photography",
        "target_audience": "Households",
        "aspect_ratio": "1:1",
        "generated_prompt": gen_data["generated_prompt"],
        "negative_prompt": gen_data["negative_prompt"],
        "image_path": file_path,
        "seed": 424242
    })
    assert_test(
        dup_res.status_code == 201 and dup_res.get_json()["data"]["id"] == campaign_id,
        "Duplicate prevention avoids creating duplicate history records"
    )

    # 17. Campaign appears in GET /api/history list
    hist_list_res = client.get("/api/history")
    items = hist_list_res.get_json()["data"]
    assert_test(
        hist_list_res.status_code == 200 and any(i["id"] == campaign_id for i in items),
        "Campaign appears in GET /api/history list"
    )

    # 18. Missing image paths safely handled with image_exists: False
    fake_record_id = CampaignModel.create({
        "campaign_title": "Ghost Campaign",
        "description": "Campaign with non-existent file",
        "category": "Climate Awareness",
        "image_style": "Digital Art",
        "target_audience": "Students",
        "image_path": "C:/non_existent_path_xyz.png"
    })
    fake_rec = CampaignModel.get_by_id(fake_record_id)
    assert_test(fake_rec["image_exists"] is False, "Missing image paths safely handled with image_exists: False")
    CampaignModel.delete(fake_record_id)

    # 19. Campaign deletion endpoint returns 200 OK and cleans up file
    del_res = client.delete(f"/api/history/{campaign_id}")
    assert_test(del_res.status_code == 200, "Campaign deletion endpoint returns 200 OK")
    assert_test(not os.path.exists(file_path), "Associated image file is safely cleaned up from disk upon deletion")

    # 20. Deleted campaign returns 404 Not Found
    check_del = client.get(f"/api/history/{campaign_id}")
    assert_test(check_del.status_code == 404, "Deleted campaign returns 404 Not Found")

    print("=" * 75)
    print(f"ALL {passed}/{total} COMPREHENSIVE END-TO-END TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_e2e_tests()
