import uuid
from datetime import datetime, timezone
from pathlib import Path
from backend.database.db import get_db_connection
from backend.config import Config


class UserModel:
    @staticmethod
    def find_by_email(email: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.*, p.full_name, p.avatar_url, p.updated_at
            FROM users u
            LEFT JOIN profiles p ON u.id = p.id
            WHERE LOWER(u.email) = LOWER(?)
            LIMIT 1
            """,
            (email.strip(),),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def find_by_id(user_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.*, p.full_name, p.avatar_url, p.updated_at
            FROM users u
            LEFT JOIN profiles p ON u.id = p.id
            WHERE u.id = ?
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def create_user_with_profile(
        email: str,
        password_hash: str,
        full_name: str,
        verification_token: str,
        verification_expires: str,
        user_id: str = None,
        email_verified: int = 0,
        auth_provider: str = "local",
        avatar_url: str = "",
    ):
        uid = user_id or str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()
        clean_email = email.strip().lower()
        clean_name = full_name.strip()

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO users (
                    id, email, password_hash, email_verified,
                    verification_token, verification_token_expires,
                    auth_provider, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uid,
                    clean_email,
                    password_hash,
                    email_verified,
                    verification_token,
                    verification_expires,
                    auth_provider,
                    now_str,
                ),
            )
            cursor.execute(
                """
                INSERT INTO profiles (id, full_name, email, avatar_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (uid, clean_name, clean_email, avatar_url, now_str, now_str),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            conn.close()
            raise
        conn.close()
        return UserModel.find_by_id(uid)

    @staticmethod
    def verify_email_by_token(token: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE verification_token = ? LIMIT 1",
            (token,),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None, "Invalid or already used verification link."

        user = dict(row)
        expires = user.get("verification_token_expires")
        if expires:
            try:
                exp_dt = datetime.fromisoformat(expires)
                if exp_dt < datetime.now(timezone.utc):
                    conn.close()
                    return None, "Verification link has expired. Please request a new one."
            except ValueError:
                pass

        cursor.execute(
            """
            UPDATE users
            SET email_verified = 1,
                verification_token = NULL,
                verification_token_expires = NULL
            WHERE id = ?
            """,
            (user["id"],),
        )
        conn.commit()
        conn.close()
        return UserModel.find_by_id(user["id"]), None

    @staticmethod
    def update_verification_token(user_id: str, token: str, expires: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET verification_token = ?, verification_token_expires = ?
            WHERE id = ?
            """,
            (token, expires, user_id),
        )
        conn.commit()
        conn.close()

    @staticmethod
    def set_reset_token(user_id: str, reset_token: str, expires: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET reset_token = ?, reset_token_expires = ?
            WHERE id = ?
            """,
            (reset_token, expires, user_id),
        )
        conn.commit()
        conn.close()

    @staticmethod
    def reset_password_by_token(reset_token: str, new_password_hash: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE reset_token = ? LIMIT 1",
            (reset_token,),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None, "Invalid or already used password reset link."

        user = dict(row)
        expires = user.get("reset_token_expires")
        if expires:
            try:
                exp_dt = datetime.fromisoformat(expires)
                if exp_dt < datetime.now(timezone.utc):
                    conn.close()
                    return None, "Password reset link has expired. Please request a new one."
            except ValueError:
                pass

        cursor.execute(
            """
            UPDATE users
            SET password_hash = ?,
                reset_token = NULL,
                reset_token_expires = NULL,
                email_verified = 1
            WHERE id = ?
            """,
            (new_password_hash, user["id"]),
        )
        conn.commit()
        conn.close()
        return UserModel.find_by_id(user["id"]), None

    @staticmethod
    def update_profile(user_id: str, full_name: str, avatar_url: str = None):
        now_str = datetime.now(timezone.utc).isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        if avatar_url is not None:
            cursor.execute(
                """
                UPDATE profiles
                SET full_name = ?, avatar_url = ?, updated_at = ?
                WHERE id = ?
                """,
                (full_name.strip(), avatar_url.strip(), now_str, user_id),
            )
        else:
            cursor.execute(
                """
                UPDATE profiles
                SET full_name = ?, updated_at = ?
                WHERE id = ?
                """,
                (full_name.strip(), now_str, user_id),
            )
        conn.commit()
        conn.close()
        return UserModel.find_by_id(user_id)

    @staticmethod
    def ensure_external_profile(user_id: str, email: str, full_name: str, avatar_url: str = ""):
        """Ensures an external/Supabase authenticated user has a local profile mirror for campaign FK/metadata."""
        existing = UserModel.find_by_id(user_id)
        if existing:
            return existing
        return UserModel.create_user_with_profile(
            user_id=user_id,
            email=email,
            password_hash="EXTERNAL_SUPABASE_AUTH",
            full_name=full_name or email.split("@")[0],
            verification_token=None,
            verification_expires=None,
            email_verified=1,
            auth_provider="supabase",
            avatar_url=avatar_url or "",
        )


class CampaignModel:
    @staticmethod
    def create(data):
        """
        Creates a new campaign record in the database using parameterized queries.
        Generates a unique UUID primary key if not provided.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        campaign_id = data.get("id") or str(uuid.uuid4())
        user_id = data.get("user_id")

        # Check if record with this id already exists to prevent duplicate insertion
        cursor.execute("SELECT id FROM campaigns WHERE id = ?", (campaign_id,))
        if cursor.fetchone():
            conn.close()
            return campaign_id

        # Normalize image_path to absolute
        raw_path = data.get("image_path", "").strip()
        if raw_path:
            p = Path(raw_path)
            if not p.is_absolute():
                p = Path(Config.GENERATED_IMAGES_DIR) / p.name
            image_path_normalized = str(p)
        else:
            image_path_normalized = ""

        # Comprehensive duplicate guard: match normalized path, filename, or exact title + prompt for user
        fname = Path(image_path_normalized).name if image_path_normalized else ""
        cursor.execute(
            """
            SELECT id FROM campaigns
            WHERE (
                (image_path = ? AND image_path != '')
                OR (image_path LIKE ? AND ? != '')
                OR (campaign_title = ? AND generated_prompt = ? AND generated_prompt != '')
            )
            AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))
            LIMIT 1
            """,
            (
                image_path_normalized,
                f"%{fname}" if fname else "",
                fname,
                data.get("campaign_title", "").strip(),
                data.get("generated_prompt", "").strip(),
                user_id,
                user_id,
            ),
        )
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return existing["id"]

        now_str = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            INSERT INTO campaigns (
                id, user_id, campaign_title, description, category, image_style,
                target_audience, aspect_ratio, generated_prompt, negative_prompt,
                image_path, created_at, seed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                campaign_id,
                user_id,
                data.get("campaign_title", "").strip(),
                data.get("description", "").strip(),
                data.get("category", "").strip(),
                data.get("image_style", "").strip(),
                data.get("target_audience", "").strip(),
                data.get("aspect_ratio", "1:1").strip(),
                data.get("generated_prompt", "").strip(),
                data.get("negative_prompt", "").strip(),
                image_path_normalized,
                now_str,
                data.get("seed"),
            ),
        )

        conn.commit()
        conn.close()
        return campaign_id

    @staticmethod
    def _hydrate_row(row):
        record = dict(row)
        raw_path = record.get("image_path", "")
        img_path = Path(raw_path) if raw_path else None

        if img_path and not img_path.is_file():
            alt_path = Path(Config.GENERATED_IMAGES_DIR) / img_path.name
            if alt_path.is_file():
                img_path = alt_path

        record["image_exists"] = bool(img_path.is_file()) if img_path else False
        record["filename"] = img_path.name if img_path else ""
        record["image_path"] = str(img_path) if img_path else ""
        return record

    @staticmethod
    def get_all(user_id=None):
        """
        Fetches campaign records ordered by creation date descending.
        When user_id is provided, returns campaigns owned by that user plus shared legacy starter campaigns (user_id IS NULL).
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        if user_id:
            cursor.execute(
                "SELECT * FROM campaigns WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC",
                (user_id,),
            )
        else:
            cursor.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()

        return [CampaignModel._hydrate_row(row) for row in rows]

    @staticmethod
    def get_by_id(campaign_id, user_id=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        if user_id:
            cursor.execute(
                "SELECT * FROM campaigns WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
                (campaign_id, user_id),
            )
        else:
            cursor.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        return CampaignModel._hydrate_row(row)

    @staticmethod
    def delete(campaign_id, user_id=None):
        """
        Safely deletes the database record and the associated generated image file on disk.
        Verifies ownership when user_id is provided.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        if user_id:
            cursor.execute(
                "SELECT image_path, user_id FROM campaigns WHERE id = ?",
                (campaign_id,),
            )
        else:
            cursor.execute("SELECT image_path, user_id FROM campaigns WHERE id = ?", (campaign_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return False, "Campaign record not found."

        if user_id and row["user_id"] and row["user_id"] != user_id:
            conn.close()
            return False, "You do not have permission to delete this campaign."

        image_path = row["image_path"]

        cursor.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
        conn.commit()
        conn.close()

        # Safely remove image file from disk if it exists
        if image_path:
            import gc
            gc.collect()
            file_to_remove = Path(image_path)
            if not file_to_remove.is_file():
                alt = Path(Config.GENERATED_IMAGES_DIR) / file_to_remove.name
                if alt.is_file():
                    file_to_remove = alt

            try:
                if file_to_remove.is_file():
                    file_to_remove.unlink()
            except Exception as e:
                print(f"Warning: Failed to delete image file {image_path}: {e}")

        return True, "Campaign deleted successfully."
