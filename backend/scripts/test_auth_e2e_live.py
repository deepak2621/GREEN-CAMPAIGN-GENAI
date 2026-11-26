r"""
Live End-to-End Authentication & AI Generation Verification Script
Runs against the live Vite dev proxy (http://localhost:5173) -> Flask API (http://127.0.0.1:5000) -> ComfyUI FLUX.2 Klein 4B (http://127.0.0.1:8188).
Verifies every authentication endpoint, protected route enforcement, profile persistence, and real FLUX.2 Klein 4B image generation after login.
"""

import io
import time
import uuid
import requests
from PIL import Image
from backend.database.db import get_db_connection

BASE_URL = "http://localhost:5173"
API_URL = f"{BASE_URL}/api"

def run_live_e2e():
    print("=" * 85)
    print("GREEN CAMPAIGN AI - LIVE AUTHENTICATION & FLUX.2 KLEIN E2E TEST")
    print("=" * 85)

    test_email = f"live_e2e_{uuid.uuid4().hex[:8]}@greencampaign.ai"
    pw_initial = "GreenPower@2026"
    pw_reset = "CleanEarth#2026"
    generated_campaign_id = None

    try:
        # 1. Verify frontend HTML loads on / and /login and /dashboard
        for path in ["/", "/login", "/signup", "/forgot-password", "/dashboard"]:
            r = requests.get(f"{BASE_URL}{path}", timeout=10)
            assert r.status_code == 200, f"Frontend route {path} failed: {r.status_code}"
        print("[PASS] 1. Frontend SPA routes (/ , /login, /signup, /forgot-password, /dashboard) served HTTP 200.")

        # 2. Protected routes reject unauthenticated requests (401)
        assert requests.get(f"{API_URL}/history", timeout=10).status_code == 401
        assert requests.post(f"{API_URL}/generate", json={}, timeout=10).status_code == 401
        assert requests.get(f"{API_URL}/auth/me", timeout=10).status_code == 401
        print("[PASS] 2. Backend protected routes (/api/history, /api/generate, /api/auth/me) enforce 401 Unauthorized without token.")

        # 3. Password validation & New User Registration
        weak = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Live Tester",
            "email": test_email,
            "password": "simplepassword",
            "confirm_password": "simplepassword",
            "terms_accepted": True,
        }, timeout=10)
        assert weak.status_code == 400, f"Expected 400 for weak password, got {weak.status_code}"

        reg = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Live Tester",
            "email": test_email,
            "password": pw_initial,
            "confirm_password": pw_initial,
            "terms_accepted": True,
        }, timeout=10)
        assert reg.status_code == 201, f"Registration failed: {reg.text}"
        verify_token = reg.json()["data"]["verification_token"]
        print(f"[PASS] 3. New user registered ({test_email}) with strong password & profile created.")

        # 4. Duplicate Email Registration blocked (409)
        dup = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Duplicate Tester",
            "email": test_email,
            "password": pw_initial,
            "confirm_password": pw_initial,
            "terms_accepted": True,
        }, timeout=10)
        assert dup.status_code == 409, f"Expected 409 for duplicate email, got {dup.status_code}"
        print("[PASS] 4. Duplicate email registration rejected cleanly with HTTP 409.")

        # 5. Unverified login blocked + Email Verification
        unverified = requests.post(f"{API_URL}/auth/login", json={
            "email": test_email,
            "password": pw_initial,
        }, timeout=10)
        assert unverified.status_code == 403, f"Expected 403 unverified, got {unverified.status_code}"

        ver = requests.post(f"{API_URL}/auth/verify-email", json={"token": verify_token}, timeout=10)
        assert ver.status_code == 200, f"Verification failed: {ver.text}"
        print("[PASS] 5. Unverified login blocked (403) and Email Verification succeeded (200).")

        # 6. Invalid login credentials rejected + Successful login
        bad = requests.post(f"{API_URL}/auth/login", json={
            "email": test_email,
            "password": "WrongPassword!9",
        }, timeout=10)
        assert bad.status_code == 401
        ok = requests.post(f"{API_URL}/auth/login", json={
            "email": test_email,
            "password": pw_initial,
            "remember_me": True,
        }, timeout=10)
        assert ok.status_code == 200, f"Login failed: {ok.text}"
        token = ok.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] 6. Invalid credentials rejected (401) and valid login issued Bearer JWT.")

        # 7. Session Persistence (/api/auth/me) & Profile Update
        me = requests.get(f"{API_URL}/auth/me", headers=headers, timeout=10)
        assert me.status_code == 200 and me.json()["data"]["user"]["email"] == test_email
        upd = requests.put(f"{API_URL}/auth/profile", json={"full_name": "Live Utility Admin"}, headers=headers, timeout=10)
        assert upd.status_code == 200 and upd.json()["data"]["user"]["full_name"] == "Live Utility Admin"
        print("[PASS] 7. Persistent session verified via /api/auth/me and profile update saved to SQLite profiles.")

        # 8. Forgot Password & Reset Password + Login with New Password
        forgot = requests.post(f"{API_URL}/auth/forgot-password", json={"email": test_email}, timeout=10)
        assert forgot.status_code == 200
        reset_token = forgot.json()["data"]["reset_token"]
        reset = requests.post(f"{API_URL}/auth/reset-password", json={
            "token": reset_token,
            "password": pw_reset,
            "confirm_password": pw_reset,
        }, timeout=10)
        assert reset.status_code == 200
        relogin = requests.post(f"{API_URL}/auth/login", json={
            "email": test_email,
            "password": pw_reset,
            "remember_me": True,
        }, timeout=10)
        assert relogin.status_code == 200
        token = relogin.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] 8. Forgot Password -> Reset Password -> Re-login with new password succeeded.")

        # 9. Authenticated AI Image Generation (FLUX.2 Klein 4B) + History Save + Cleanup
        t0 = time.time()
        gen = requests.post(f"{API_URL}/generate", json={
            "campaign_title": "Save Water After Login",
            "description": "Turning off running bathroom taps to save clean water",
            "category": "Water Conservation",
            "image_style": "3D Illustration",
            "target_audience": "Students",
            "aspect_ratio": "1:1",
        }, headers=headers, timeout=180)
        elapsed = round(time.time() - t0, 2)
        assert gen.status_code == 200, f"AI generation failed: {gen.text}"
        gen_data = gen.json()["data"]
        img_res = requests.get(f"{BASE_URL}{gen_data['image_url']}", timeout=15)
        assert img_res.status_code == 200
        img = Image.open(io.BytesIO(img_res.content))
        assert img.format == "PNG" and img.size == (512, 512)
        print(f"[PASS] 9. Authenticated FLUX.2 Klein 4B generation succeeded in {elapsed}s ({img.size}, {len(img_res.content):,} bytes).")

        # Save to history & clean up test record + image
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
        print("[PASS] 10. Authenticated history save & delete verified cleanly.")

        # 11. Logout endpoint
        out = requests.post(f"{API_URL}/auth/logout", headers=headers, timeout=10)
        assert out.status_code == 200
        print("[PASS] 11. Logout confirmed cleanly.")

        print("=" * 85)
        print("ALL LIVE VITE PROXY + FLASK AUTH + FLUX.2 KLEIN E2E CHECKS PASSED!")
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

