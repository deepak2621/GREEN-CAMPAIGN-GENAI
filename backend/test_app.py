import os
import uuid
import unittest
from pathlib import Path
from PIL import Image
from backend.app import create_app
from backend.config import Config
from backend.database.db import get_db_connection
from backend.services.prompt_builder import build_prompt
from backend.services.model_config import Flux1DevConfig


class GreenCampaignAITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def _register_and_login_test_user(self, email=None, password="TestUser@1234"):
        test_email = email or f"qa_{uuid.uuid4().hex[:8]}@greencampaign.ai"
        reg_res = self.client.post("/api/auth/register", json={
            "full_name": "QA Test Engineer",
            "email": test_email,
            "password": password,
            "confirm_password": password,
            "terms_accepted": True,
        })
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["data"]["verification_token"]

        ver_res = self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual(ver_res.status_code, 200)

        login_res = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": password,
            "remember_me": True,
        })
        self.assertEqual(login_res.status_code, 200)
        access_token = login_res.get_json()["data"]["access_token"]
        return test_email, access_token, {"Authorization": f"Bearer {access_token}"}

    def _cleanup_test_user(self, email):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE email = ?", (email,))
        conn.commit()
        conn.close()

    def test_01_health_check(self):
        """Test health check returns 200 and FLUX.1 Dev metadata."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("FLUX.1 Dev", data["model"])
        self.assertTrue(data["storage_ready"])

    def test_02_config_endpoint(self):
        """Test config endpoint returns categories, styles, audiences, and fast/quality presets."""
        response = self.client.get("/api/config")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("Water Conservation", data["categories"])
        self.assertIn("Realistic Photography", data["styles"])
        self.assertIn("General Public", data["audiences"])
        self.assertIn("fast", data["presets"])
        self.assertIn("quality", data["presets"])
        self.assertEqual(data["presets"]["fast"]["aspect_ratios"]["1:1"]["width"], 512)
        self.assertEqual(data["presets"]["quality"]["aspect_ratios"]["1:1"]["width"], 768)

    def test_03_system_metrics_requires_auth_and_returns_real_data(self):
        """Test /api/system-metrics requires auth and returns real hardware telemetry."""
        self.assertEqual(self.client.get("/api/system-metrics").status_code, 401)
        email, _, headers = self._register_and_login_test_user()
        try:
            res = self.client.get("/api/system-metrics", headers=headers)
            self.assertEqual(res.status_code, 200)
            metrics = res.get_json()["data"]
            self.assertIn("ram_total_gb", metrics)
            self.assertGreater(metrics["ram_total_gb"], 0)
            self.assertIn("generation_status", metrics)
        finally:
            self._cleanup_test_user(email)

    def test_04_prompt_builder_preserves_user_intent_and_custom_prompt(self):
        """Test prompt builder keeps user prompt front-loaded and respects custom_prompt verbatim."""
        res_user = build_prompt(
            theme="Coral Reef Restoration",
            description="Divers planting healthy coral fragments in crystal clear turquoise ocean water",
            category="Climate Awareness",
            image_style="Realistic Photography",
            target_audience="Students",
            aspect_ratio="16:9",
            preset="quality",
        )
        self.assertTrue(res_user["prompt"].startswith("Coral Reef Restoration: Divers planting healthy coral fragments"))
        self.assertEqual(res_user["dimensions"], {"width": 896, "height": 512, "label": "Landscape (16:9)"})

        exact = "A close-up photograph of solar engineers inspecting photovoltaic panels at sunrise"
        res_custom = build_prompt(
            theme="Solar",
            description="Solar",
            category="Renewable Energy",
            image_style="Realistic Photography",
            target_audience="General Public",
            custom_prompt=exact,
        )
        self.assertEqual(res_custom["prompt"], exact)

    def test_05_protected_routes_reject_unauthenticated(self):
        """Test that unauthenticated requests to protected endpoints fail with 401."""
        self.assertEqual(self.client.post("/api/generate", json={}).status_code, 401)
        self.assertEqual(self.client.post("/api/generate/start", json={}).status_code, 401)
        self.assertEqual(self.client.get("/api/history").status_code, 401)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_06_validation_empty_inputs_authenticated(self):
        """Test that empty or missing fields are rejected with 400 for authenticated users."""
        email, _, headers = self._register_and_login_test_user()
        try:
            response = self.client.post("/api/generate", json={}, headers=headers)
            self.assertEqual(response.status_code, 400)
            data = response.get_json()
            self.assertEqual(data["error_type"], "ValidationError")
            self.assertIn("campaign_title", data["errors"])
            self.assertIn("category", data["errors"])
            self.assertIn("image_style", data["errors"])
        finally:
            self._cleanup_test_user(email)

    def test_07_configuration_error_on_missing_model_files(self):
        """Test that missing FLUX.1 Dev checkpoint files return clear ConfigurationError 422."""
        email, _, headers = self._register_and_login_test_user()
        orig_unet = Flux1DevConfig.UNET_PATH
        try:
            Flux1DevConfig.UNET_PATH = Path("non_existent_flux1_dev.gguf")
            payload = {
                "campaign_title": "Clean Oceans",
                "description": "Zero plastic in oceans",
                "category": "Pollution Control",
                "image_style": "Digital Art",
                "target_audience": "General Public",
                "preset": "fast",
            }
            response = self.client.post("/api/generate", json=payload, headers=headers)
            self.assertEqual(response.status_code, 422)
            data = response.get_json()
            self.assertEqual(data["error_type"], "ConfigurationError")
            self.assertIn("FLUX.1 Dev model files not found", data["message"])
        finally:
            Flux1DevConfig.UNET_PATH = orig_unet
            self._cleanup_test_user(email)

    def test_08_history_crud_duplicate_prevention_and_security(self):
        """Test saving campaign, duplicate prevention, path traversal protection, and ownership enforcement."""
        email1, _, headers1 = self._register_and_login_test_user()
        email2, _, headers2 = self._register_and_login_test_user()
        try:
            gen_dir = Config.GENERATED_IMAGES_DIR
            os.makedirs(gen_dir, exist_ok=True)
            test_img_path = os.path.join(gen_dir, f"test_sample_{uuid.uuid4().hex[:6]}.png")
            img = Image.new("RGB", (512, 512), color=(16, 185, 129))
            img.save(test_img_path, format="PNG")

            history_payload = {
                "campaign_title": "Save Water Summer",
                "description": "Smart irrigation for parks",
                "category": "Water Conservation",
                "image_style": "3D Illustration",
                "target_audience": "Households",
                "aspect_ratio": "1:1",
                "generated_prompt": "3D render of water droplet",
                "negative_prompt": "blurry",
                "image_path": test_img_path,
                "seed": 987654,
            }

            save_res = self.client.post("/api/history", json=history_payload, headers=headers1)
            self.assertEqual(save_res.status_code, 201)
            campaign_id = save_res.get_json()["data"]["id"]

            dup_res = self.client.post("/api/history", json=history_payload, headers=headers1)
            self.assertEqual(dup_res.get_json()["data"]["id"], campaign_id)

            # User 2 cannot delete User 1's campaign
            forbidden_del = self.client.delete(f"/api/history/{campaign_id}", headers=headers2)
            self.assertEqual(forbidden_del.status_code, 403)

            # Path traversal on image endpoint returns 404
            self.assertEqual(self.client.get("/api/images/..%2F..%2Fconfig.py").status_code, 404)

            # Owner can delete cleanly
            del_res = self.client.delete(f"/api/history/{campaign_id}", headers=headers1)
            self.assertEqual(del_res.status_code, 200)
            self.assertFalse(os.path.exists(test_img_path))
        finally:
            self._cleanup_test_user(email1)
            self._cleanup_test_user(email2)

    def test_09_full_auth_lifecycle_and_avatar_xss_guard(self):
        """Tests registration, duplicate email, verification, login, XSS avatar URL rejection, and password reset."""
        test_email = f"auth_life_{uuid.uuid4().hex[:8]}@greencampaign.ai"
        pw1 = "GreenAI@2026"
        pw2 = "EcoPower#99"

        try:
            weak_res = self.client.post("/api/auth/register", json={
                "full_name": "Eco Tester",
                "email": test_email,
                "password": "weak",
                "confirm_password": "weak",
                "terms_accepted": True,
            })
            self.assertEqual(weak_res.status_code, 400)

            reg_res = self.client.post("/api/auth/register", json={
                "full_name": "Eco Tester",
                "email": test_email,
                "password": pw1,
                "confirm_password": pw1,
                "terms_accepted": True,
            })
            self.assertEqual(reg_res.status_code, 201)
            verify_token = reg_res.get_json()["data"]["verification_token"]

            dup_res = self.client.post("/api/auth/register", json={
                "full_name": "Eco Tester 2",
                "email": test_email,
                "password": pw1,
                "confirm_password": pw1,
                "terms_accepted": True,
            })
            self.assertEqual(dup_res.status_code, 409)

            self.assertEqual(
                self.client.post("/api/auth/login", json={"email": test_email, "password": pw1}).status_code,
                403,
            )

            self.assertEqual(self.client.post("/api/auth/verify-email", json={"token": verify_token}).status_code, 200)

            self.assertEqual(
                self.client.post("/api/auth/login", json={"email": test_email, "password": "WrongPassword!1"}).status_code,
                401,
            )

            ok_login = self.client.post("/api/auth/login", json={
                "email": test_email,
                "password": pw1,
                "remember_me": True,
            })
            self.assertEqual(ok_login.status_code, 200)
            headers = {"Authorization": f"Bearer {ok_login.get_json()['data']['access_token']}"}

            # Reject javascript: avatar_url
            bad_avatar = self.client.put(
                "/api/auth/profile",
                json={"full_name": "Eco Lead Tester", "avatar_url": "javascript:alert(1)"},
                headers=headers,
            )
            self.assertEqual(bad_avatar.status_code, 400)

            upd_res = self.client.put(
                "/api/auth/profile",
                json={"full_name": "Eco Lead Tester", "avatar_url": "https://example.com/avatar.png"},
                headers=headers,
            )
            self.assertEqual(upd_res.status_code, 200)
            self.assertEqual(upd_res.get_json()["data"]["user"]["full_name"], "Eco Lead Tester")

            forgot_res = self.client.post("/api/auth/forgot-password", json={"email": test_email})
            reset_token = forgot_res.get_json()["data"]["reset_token"]

            reset_res = self.client.post("/api/auth/reset-password", json={
                "token": reset_token,
                "password": pw2,
                "confirm_password": pw2,
            })
            self.assertEqual(reset_res.status_code, 200)
            self.assertEqual(
                self.client.post("/api/auth/login", json={"email": test_email, "password": pw1}).status_code,
                401,
            )
            self.assertEqual(
                self.client.post("/api/auth/login", json={"email": test_email, "password": pw2}).status_code,
                200,
            )
        finally:
            self._cleanup_test_user(test_email)


if __name__ == "__main__":
    unittest.main()
