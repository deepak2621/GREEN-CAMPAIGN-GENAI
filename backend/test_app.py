import os
import uuid
import unittest
from PIL import Image
from backend.app import create_app
from backend.config import Config
from backend.database.db import get_db_connection
from backend.services.prompt_builder import build_prompt


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
            "terms_accepted": True
        })
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["data"]["verification_token"]

        ver_res = self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual(ver_res.status_code, 200)

        login_res = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": password,
            "remember_me": True
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
        """Test health check returns 200 and valid json."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("provider", data)
        self.assertTrue(data["storage_ready"])

    def test_02_config_endpoint(self):
        """Test config endpoint returns allowed categories, styles, audiences."""
        response = self.client.get("/api/config")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("Water Conservation", data["categories"])
        self.assertIn("3D Illustration", data["styles"])
        self.assertIn("General Public", data["audiences"])
        self.assertTrue(len(data["aspect_ratios"]) >= 3)

    def test_03_cooldown_endpoint(self):
        """Test /api/cooldown returns cooldown status."""
        response = self.client.get("/api/cooldown")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("cooldown_remaining", data)
        self.assertIn("ready", data)

    def test_04_prompt_builder_category_relevance_and_exclusions(self):
        """Test prompt builder ensures category focus and negative exclusions."""
        res_water = build_prompt(
            theme="Save Water",
            description="Person closing tap while brushing",
            category="Water Conservation",
            image_style="3D Illustration",
            target_audience="Students",
            aspect_ratio="1:1"
        )
        self.assertIn("Save Water", res_water["prompt"])
        self.assertIn("water droplet", res_water["prompt"].lower())
        self.assertIn("solar panels", res_water["negative_prompt"].lower())
        self.assertIn("wind turbines", res_water["negative_prompt"].lower())

        res_energy = build_prompt(
            theme="Save Electricity",
            description="Turn off unused lights",
            category="Energy Conservation",
            image_style="Realistic Photography",
            target_audience="Households",
            aspect_ratio="16:9"
        )
        self.assertIn("Save Electricity", res_energy["prompt"])
        self.assertIn("led light bulb", res_energy["prompt"].lower())
        self.assertIn("water droplets", res_energy["negative_prompt"].lower())
        self.assertIn("faucet", res_energy["negative_prompt"].lower())

    def test_05_protected_routes_reject_unauthenticated(self):
        """Test that unauthenticated requests to protected endpoints fail with 401."""
        self.assertEqual(self.client.post("/api/generate", json={}).status_code, 401)
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
        """Test that missing checkpoint files return clear ConfigurationError 422."""
        from pathlib import Path
        from backend.services.model_config import Flux2KleinConfig
        email, _, headers = self._register_and_login_test_user()
        orig_unet = Flux2KleinConfig.UNET_PATH
        try:
            Flux2KleinConfig.UNET_PATH = Path("non_existent_model.gguf")
            payload = {
                "campaign_title": "Clean Oceans",
                "description": "Zero plastic in oceans",
                "category": "Pollution Control",
                "image_style": "Digital Art",
                "target_audience": "General Public"
            }
            response = self.client.post("/api/generate", json=payload, headers=headers)
            self.assertEqual(response.status_code, 422)
            data = response.get_json()
            self.assertEqual(data["error_type"], "ConfigurationError")
            self.assertIn("FLUX.2 Klein files not found", data["message"])
        finally:
            Flux2KleinConfig.UNET_PATH = orig_unet
            self._cleanup_test_user(email)

    def test_08_history_crud_duplicate_prevention_and_seed(self):
        """Test saving campaign with seed, duplicate prevention, and deletion."""
        email, _, headers = self._register_and_login_test_user()
        try:
            gen_dir = Config.GENERATED_IMAGES_DIR
            os.makedirs(gen_dir, exist_ok=True)
            test_img_path = os.path.join(gen_dir, "test_sample_campaign.png")
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
                "negative_prompt": "blurry, solar panels",
                "image_path": test_img_path,
                "seed": 987654
            }

            save_res = self.client.post("/api/history", json=history_payload, headers=headers)
            self.assertEqual(save_res.status_code, 201)
            campaign_id = save_res.get_json()["data"]["id"]
            self.assertTrue(campaign_id)

            dup_res = self.client.post("/api/history", json=history_payload, headers=headers)
            self.assertEqual(dup_res.status_code, 201)
            self.assertEqual(dup_res.get_json()["data"]["id"], campaign_id)

            list_res = self.client.get("/api/history", headers=headers)
            self.assertEqual(list_res.status_code, 200)
            items = list_res.get_json()["data"]
            matching = [i for i in items if i["id"] == campaign_id]
            self.assertEqual(len(matching), 1)
            self.assertTrue(matching[0]["image_exists"])

            del_res = self.client.delete(f"/api/history/{campaign_id}", headers=headers)
            self.assertEqual(del_res.status_code, 200)

            get_res = self.client.get(f"/api/history/{campaign_id}", headers=headers)
            self.assertEqual(get_res.status_code, 404)
        finally:
            self._cleanup_test_user(email)

    def test_09_full_auth_lifecycle_unit(self):
        """Tests registration, duplicate email, invalid login, unverified login block, verification, forgot/reset password, and profile update."""
        test_email = f"auth_life_{uuid.uuid4().hex[:8]}@greencampaign.ai"
        pw1 = "GreenAI@2026"
        pw2 = "EcoPower#99"

        try:
            # 1. Weak password rejection
            weak_res = self.client.post("/api/auth/register", json={
                "full_name": "Eco Tester",
                "email": test_email,
                "password": "weak",
                "confirm_password": "weak",
                "terms_accepted": True
            })
            self.assertEqual(weak_res.status_code, 400)

            # 2. Valid Registration
            reg_res = self.client.post("/api/auth/register", json={
                "full_name": "Eco Tester",
                "email": test_email,
                "password": pw1,
                "confirm_password": pw1,
                "terms_accepted": True
            })
            self.assertEqual(reg_res.status_code, 201)
            verify_token = reg_res.get_json()["data"]["verification_token"]

            # 3. Duplicate email rejected (409)
            dup_res = self.client.post("/api/auth/register", json={
                "full_name": "Eco Tester 2",
                "email": test_email,
                "password": pw1,
                "confirm_password": pw1,
                "terms_accepted": True
            })
            self.assertEqual(dup_res.status_code, 409)

            # 4. Login blocked before email verification (403)
            unverified_login = self.client.post("/api/auth/login", json={
                "email": test_email,
                "password": pw1
            })
            self.assertEqual(unverified_login.status_code, 403)

            # 5. Email verification succeeds
            ver_res = self.client.post("/api/auth/verify-email", json={"token": verify_token})
            self.assertEqual(ver_res.status_code, 200)

            # 6. Invalid password rejected (401)
            bad_login = self.client.post("/api/auth/login", json={
                "email": test_email,
                "password": "WrongPassword!1"
            })
            self.assertEqual(bad_login.status_code, 401)

            # 7. Valid login succeeds
            ok_login = self.client.post("/api/auth/login", json={
                "email": test_email,
                "password": pw1,
                "remember_me": True
            })
            self.assertEqual(ok_login.status_code, 200)
            jwt_token = ok_login.get_json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {jwt_token}"}

            # 8. Profile fetch & update
            me_res = self.client.get("/api/auth/me", headers=headers)
            self.assertEqual(me_res.status_code, 200)
            self.assertEqual(me_res.get_json()["data"]["user"]["full_name"], "Eco Tester")

            upd_res = self.client.put("/api/auth/profile", json={"full_name": "Eco Lead Tester"}, headers=headers)
            self.assertEqual(upd_res.status_code, 200)
            self.assertEqual(upd_res.get_json()["data"]["user"]["full_name"], "Eco Lead Tester")

            # 9. Forgot password & reset password
            forgot_res = self.client.post("/api/auth/forgot-password", json={"email": test_email})
            self.assertEqual(forgot_res.status_code, 200)
            reset_token = forgot_res.get_json()["data"]["reset_token"]
            self.assertTrue(reset_token)

            reset_res = self.client.post("/api/auth/reset-password", json={
                "token": reset_token,
                "password": pw2,
                "confirm_password": pw2
            })
            self.assertEqual(reset_res.status_code, 200)

            # 10. Old password fails, new password succeeds
            old_pw_login = self.client.post("/api/auth/login", json={"email": test_email, "password": pw1})
            self.assertEqual(old_pw_login.status_code, 401)

            new_pw_login = self.client.post("/api/auth/login", json={"email": test_email, "password": pw2})
            self.assertEqual(new_pw_login.status_code, 200)
        finally:
            self._cleanup_test_user(test_email)


if __name__ == "__main__":
    unittest.main()
