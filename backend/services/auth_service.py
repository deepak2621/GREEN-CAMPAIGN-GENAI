"""
Authentication Service for Green Campaign AI.
Supports:
1. Local secure PBKDF2/scrypt password hashing + HS256 JWT sessions + email verification + password reset.
2. Seamless Supabase Auth JWT verification when SUPABASE_URL / SUPABASE_JWT_SECRET are configured.
"""

import re
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
import requests
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash

from backend.config import Config
from backend.database.models import UserModel


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


class AuthService:
    @staticmethod
    def validate_email(email: str):
        if not email or not email.strip():
            return False, "Email address is required."
        if not EMAIL_REGEX.match(email.strip()):
            return False, "Please enter a valid email address."
        return True, None

    @staticmethod
    def validate_password(password: str):
        """
        Enforces strict password policy:
        - Minimum 8 characters
        - At least 1 uppercase letter
        - At least 1 lowercase letter
        - At least 1 digit
        - At least 1 special character
        """
        if not password:
            return False, "Password is required."
        if len(password) < 8:
            return False, "Password must be at least 8 characters long."
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter."
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter."
        if not re.search(r"[0-9]", password):
            return False, "Password must contain at least one number."
        if not re.search(r"[^A-Za-z0-9]", password):
            return False, "Password must contain at least one special character."
        return True, None

    @staticmethod
    def hash_password(password: str) -> str:
        return generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        if not password_hash or password_hash == "EXTERNAL_SUPABASE_AUTH":
            return False
        return check_password_hash(password_hash, password)

    @staticmethod
    def generate_jwt(user: dict, remember_me: bool = False) -> str:
        now = datetime.now(timezone.utc)
        hours = 24 * 30 if remember_me else Config.JWT_EXPIRATION_HOURS
        payload = {
            "sub": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "provider": user.get("auth_provider", "local"),
            "iat": now,
            "exp": now + timedelta(hours=hours),
        }
        return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

    @staticmethod
    def generate_secure_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def sanitize_user(user: dict) -> dict:
        if not user:
            return None
        return {
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name") or user["email"].split("@")[0],
            "avatar_url": user.get("avatar_url") or "",
            "email_verified": bool(user.get("email_verified")),
            "auth_provider": user.get("auth_provider", "local"),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at"),
        }

    @staticmethod
    def verify_token(token: str):
        """
        Verifies Bearer token against Local JWT first, then Supabase Auth if configured.
        Returns sanitized user dict or None.
        """
        if not token:
            return None

        # 1. Try Local JWT verification
        try:
            decoded = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            user_id = decoded.get("sub")
            if user_id:
                user = UserModel.find_by_id(user_id)
                if user:
                    return AuthService.sanitize_user(user)
        except jwt.PyJWTError:
            pass

        # 2. Try Supabase JWT verification (HS256 secret or /auth/v1/user)
        if Config.SUPABASE_JWT_SECRET:
            try:
                decoded = jwt.decode(
                    token,
                    Config.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated",
                )
                uid = decoded.get("sub")
                email = decoded.get("email", "")
                meta = decoded.get("user_metadata") or {}
                full_name = meta.get("full_name") or meta.get("name") or (email.split("@")[0] if email else "User")
                avatar_url = meta.get("avatar_url") or meta.get("picture") or ""
                if uid and email:
                    user = UserModel.ensure_external_profile(uid, email, full_name, avatar_url)
                    return AuthService.sanitize_user(user)
            except jwt.PyJWTError:
                pass

        if Config.SUPABASE_URL and Config.SUPABASE_ANON_KEY:
            try:
                res = requests.get(
                    f"{Config.SUPABASE_URL}/auth/v1/user",
                    headers={
                        "apikey": Config.SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {token}",
                    },
                    timeout=5,
                )
                if res.status_code == 200:
                    sb_user = res.json()
                    uid = sb_user.get("id")
                    email = sb_user.get("email", "")
                    meta = sb_user.get("user_metadata") or {}
                    full_name = meta.get("full_name") or meta.get("name") or (email.split("@")[0] if email else "User")
                    avatar_url = meta.get("avatar_url") or meta.get("picture") or ""
                    if uid and email:
                        user = UserModel.ensure_external_profile(uid, email, full_name, avatar_url)
                        return AuthService.sanitize_user(user)
            except Exception:
                pass

        return None

    @staticmethod
    def send_auth_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """
        Sends transactional auth email via SMTP when configured.
        Returns True if sent over SMTP, False if running in local dev preview mode.
        """
        if not (Config.SMTP_HOST and Config.SMTP_USER and Config.SMTP_PASSWORD):
            return False

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = Config.SMTP_FROM_EMAIL
            msg["To"] = to_email
            msg.set_content(text_body)
            msg.add_alternative(html_body, subtype="html")

            with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Warning: SMTP email send failed for {to_email}: {e}")
            return False


def require_auth(f):
    """Flask route decorator enforcing valid Bearer JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

        if not token:
            return jsonify({
                "success": False,
                "error_type": "AuthenticationError",
                "message": "Authentication required. Please sign in to access this resource."
            }), 401

        user = AuthService.verify_token(token)
        if not user:
            return jsonify({
                "success": False,
                "error_type": "AuthenticationError",
                "message": "Your session has expired or is invalid. Please sign in again."
            }), 401

        g.current_user = user
        g.current_user_id = user["id"]
        return f(*args, **kwargs)

    return decorated

