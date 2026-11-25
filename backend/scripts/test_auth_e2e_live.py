r"""
Live End-to-End Authentication, Telemetry, and FLUX.1 Dev AI Generation Verification Script.
Runs against the live Vite dev proxy (http://localhost:5173) -> Flask API (http://127.0.0.1:5000) -> ComfyUI FLUX.1 Dev (http://127.0.0.1:8188).
"""

import io
import sys
import time
import uuid
from pathlib import Path
import requests
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from backend.database.db import get_db_connection

BASE_URL = "http://localhost:5173"
API_URL = f"{BASE_URL}/api"


def run_live_e2e():
    print("=" * 85)
    print("GREEN CAMPAIGN AI - LIVE AUTHENTICATION & FLUX.1 DEV E2E TEST")
    print("=" * 85)

    test_email = f"live_e2e_{uuid.uuid4().hex[:8]}@greencampaign.ai"
    pw_initial = "GreenPower@2026"
    pw_reset = "CleanEarth#2026"
    generated_campaign_id = None

    try:
        for path in ["/", "/login", "/signup", "/forgot-password", "/dashboard"]:
            r = requests.get(f"{BASE_URL}{path}", timeout=10)
            assert r.status_code == 200, f"Frontend route {path} failed: {r.status_code}"
        print("[PASS] 1. Frontend SPA routes served HTTP 200.")

        assert requests.get(f"{API_URL}/history", timeout=10).status_code == 401
        assert requests.post(f"{API_URL}/generate", json={}, timeout=10).status_code == 401
        assert requests.post(f"{API_URL}/generate/start", json={}, timeout=10).status_code == 401
        assert requests.get(f"{API_URL}/system-metrics", timeout=10).status_code == 401
        assert requests.get(f"{API_URL}/auth/me", timeout=10).status_code == 401
        print("[PASS] 2. Protected routes enforce 401 Unauthorized without token.")

        weak = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Live Tester",
            "email": test_email,
            "password": "simplepassword",
            "confirm_password": "simplepassword",
            "terms_accepted": True,
        }, timeout=10)
        assert weak.status_code == 400

        reg = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Live Tester",
            "email": test_email,
            "password": pw_initial,
            "confirm_password": pw_initial,
            "terms_accepted": True,
        }, timeout=10)
        assert reg.status_code == 201, f"Registration failed: {reg.text}"
        verify_token = reg.json()["data"]["verification_token"]
        print(f"[PASS] 3. New user registered ({test_email}).")

        dup = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Duplicate Tester",
            "email": test_email,
            "password": pw_initial,
            "confirm_password": pw_initial,
            "terms_accepted": True,
        }, timeout=10)
        assert dup.status_code == 409
        print("[PASS] 4. Duplicate email rejected cleanly with 409.")

        assert requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": pw_initial}, timeout=10).status_code == 403
        assert requests.post(f"{API_URL}/auth/verify-email", json={"token": verify_token}, timeout=10).status_code == 200
        print("[PASS] 5. Unverified login blocked (403) & email verified (200).")

        assert requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": "WrongPassword!9"}, timeout=10).status_code == 401
        ok = requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": pw_initial, "remember_me": True}, timeout=10)
        assert ok.status_code == 200
        token = ok.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] 6. Invalid credentials rejected (401) & valid login issued Bearer JWT.")

        me = requests.get(f"{API_URL}/auth/me", headers=headers, timeout=10)
        assert me.status_code == 200 and me.json()["data"]["user"]["email"] == test_email
        upd = requests.put(f"{API_URL}/auth/profile", json={"full_name": "Live Utility Admin"}, headers=headers, timeout=10)
        assert upd.status_code == 200 and upd.json()["data"]["user"]["full_name"] == "Live Utility Admin"
        print("[PASS] 7. Session verified via /api/auth/me and profile updated.")

        forgot = requests.post(f"{API_URL}/auth/forgot-password", json={"email": test_email}, timeout=10)
        reset_token = forgot.json()["data"]["reset_token"]
        assert requests.post(f"{API_URL}/auth/reset-password", json={"token": reset_token, "password": pw_reset, "confirm_password": pw_reset}, timeout=10).status_code == 200
        relogin = requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": pw_reset, "remember_me": True}, timeout=10)
        assert relogin.status_code == 200
        token = relogin.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] 8. Password reset flow succeeded.")

        metrics = requests.get(f"{API_URL}/system-metrics", headers=headers, timeout=10)
        assert metrics.status_code == 200 and metrics.json()["data"]["ram_total_gb"] > 0
        print("[PASS] 9. Hardware telemetry endpoint verified.")

        # Async FLUX.1 Dev Fast Mode generation + real progress polling
        t0 = time.time()
        start_res = requests.post(f"{API_URL}/generate/start", json={
            "campaign_title": "Forest Biodiversity Protection",
            "description": "Photorealistic sunlit rainforest canopy with a clear river and lush greenery",
            "category": "Climate Awareness",
            "image_style": "Realistic Photography",
            "target_audience": "General Public",
            "aspect_ratio": "1:1",
            "preset": "fast",
        }, headers=headers, timeout=30)
        assert start_res.status_code == 202, f"Async start failed: {start_res.text}"
        job_id = start_res.json()["data"]["job_id"]

        gen_data = None
        seen_progress = False
        while time.time() - t0 < 240:
            st_res = requests.get(f"{API_URL}/generate/status/{job_id}", headers=headers, timeout=10)
            assert st_res.status_code == 200
            job = st_res.json()["data"]
            if job.get("step", 0) > 0:
                seen_progress = True
            if job["status"] == "completed":
                gen_data = job["result"]
                break
            if job["status"] == "error":
                raise AssertionError(f"Generation error: {job.get('error')}")
            time.sleep(1.0)

        assert gen_data is not None, "Async generation timed out"
        elapsed = round(time.time() - t0, 2)
        img_res = requests.get(f"{BASE_URL}{gen_data['image_url']}", timeout=15)
        assert img_res.status_code == 200
        img = Image.open(io.BytesIO(img_res.content))
        assert img.format == "PNG" and img.size == (512, 512)
        dl_res = requests.get(f"{BASE_URL}{gen_data['download_url']}", timeout=15)
        assert dl_res.status_code == 200 and "attachment" in dl_res.headers.get("Content-Disposition", "")
        print(f"[PASS] 10. FLUX.1 Dev async generation succeeded in {elapsed}s (progress_events={seen_progress}, size={img.size}).")

        hist_save = requests.post(f"{API_URL}/history", json={
            "campaign_title": gen_data["campaign_title"],
            "description": gen_data["description"],
            "category": gen_data["category"],
            "image_style": gen_data["image_style"],
            "target_audience": gen_data["target_audience"],
            "aspect_ratio": gen_data["aspect_ratio"],
            "generated_prompt": gen_data["generated_prompt"],
            "negative_prompt": gen_data["negative_prompt"],
            "image_path": gen_data["file_path"],
            "seed": gen_data.get("seed"),
        }, headers=headers, timeout=10)
        assert hist_save.status_code == 201
        generated_campaign_id = hist_save.json()["data"]["id"]

        hist_del = requests.delete(f"{API_URL}/history/{generated_campaign_id}", headers=headers, timeout=10)
        assert hist_del.status_code == 200
        generated_campaign_id = None
        print("[PASS] 11. Authenticated history save & delete verified cleanly.")

        out = requests.post(f"{API_URL}/auth/logout", headers=headers, timeout=10)
        assert out.status_code == 200
        print("[PASS] 12. Logout confirmed cleanly.")
        print("=" * 85)
        print("ALL LIVE VITE PROXY + FLASK AUTH + FLUX.1 DEV E2E CHECKS PASSED!")
        print("=" * 85)
    finally:
        conn = get_db_connection()
        cursor = conn.cursor()
        if generated_campaign_id:
            cursor.execute("DELETE FROM campaigns WHERE id = ?", (generated_campaign_id,))
        cursor.execute("DELETE FROM users WHERE email = ?", (test_email,))
        conn.commit()
        conn.close()


if __name__ == "__main__":
    run_live_e2e()
