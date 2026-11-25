import logging
from urllib.parse import urlparse
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from backend.config import Config
from backend.database.models import UserModel
from backend.services.auth_service import AuthService, require_auth

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger("green_campaign_ai")


def _validate_avatar_url(raw_url: str):
    cleaned = (raw_url or "").strip()
    if not cleaned:
        return True, ""
    if len(cleaned) > 500:
        return False, "Avatar URL must be 500 characters or fewer."
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False, "Avatar URL must be a valid http:// or https:// URL."
    return True, cleaned


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    """
    Registers a new user account, creates their profile record, enforces password policy,
    and issues an email verification token.
    """
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""
    terms_accepted = bool(data.get("terms_accepted"))

    errors = {}
    if not full_name or len(full_name) < 2:
        errors["full_name"] = "Full name must be at least 2 characters."
    elif len(full_name) > 120:
        errors["full_name"] = "Full name must be 120 characters or fewer."

    email_ok, email_err = AuthService.validate_email(email)
    if not email_ok:
        errors["email"] = email_err

    pass_ok, pass_err = AuthService.validate_password(password)
    if not pass_ok:
        errors["password"] = pass_err

    if password != confirm_password:
        errors["confirm_password"] = "Passwords do not match."

    if not terms_accepted:
        errors["terms_accepted"] = "You must accept the Terms and Conditions to create an account."

    if errors:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Please fix the highlighted registration errors.",
            "errors": errors,
        }), 400

    existing = UserModel.find_by_email(email)
    if existing:
        return jsonify({
            "success": False,
            "error_type": "DuplicateEmailError",
            "message": "An account with this email address already exists. Please sign in instead.",
            "errors": {"email": "This email address is already registered."},
        }), 409

    verification_token = AuthService.generate_secure_token()
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    password_hash = AuthService.hash_password(password)

    user = UserModel.create_user_with_profile(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        verification_token=verification_token,
        verification_expires=verification_expires,
        email_verified=0,
        auth_provider="local",
    )

    verify_url = f"{Config.FRONTEND_URL}/verify-email?token={verification_token}"
    email_sent = AuthService.send_auth_email(
        to_email=email,
        subject="Verify your Green Campaign AI account",
        html_body=f"<p>Welcome {full_name},</p><p>Click to verify your email: <a href='{verify_url}'>{verify_url}</a></p>",
        text_body=f"Welcome {full_name},\n\nVerify your Green Campaign AI account: {verify_url}",
    )

    response_data = {
        "user": AuthService.sanitize_user(user),
        "requires_verification": True,
        "email_sent": email_sent,
    }
    if not email_sent and Config.ALLOW_DEV_AUTH_LINKS:
        response_data["dev_verification_url"] = f"/verify-email?token={verification_token}"
        response_data["verification_token"] = verification_token

    return jsonify({
        "success": True,
        "message": "Account created! Please verify your email address before signing in.",
        "data": response_data,
    }), 201


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """Authenticates user credentials and issues signed JWT session token."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me", False))

    errors = {}
    email_ok, email_err = AuthService.validate_email(email)
    if not email_ok:
        errors["email"] = email_err
    if not password:
        errors["password"] = "Password is required."

    if errors:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Please enter a valid email and password.",
            "errors": errors,
        }), 400

    user = UserModel.find_by_email(email)
    if not user or not AuthService.verify_password(password, user.get("password_hash", "")):
        return jsonify({
            "success": False,
            "error_type": "InvalidCredentialsError",
            "message": "Invalid email address or password. Please check your credentials and try again.",
        }), 401

    if not user.get("email_verified"):
        return jsonify({
            "success": False,
            "error_type": "EmailNotVerifiedError",
            "requires_verification": True,
            "email": email,
            "message": "Please verify your email address before signing in. Check your inbox or resend verification.",
        }), 403

    token = AuthService.generate_jwt(user, remember_me=remember_me)
    return jsonify({
        "success": True,
        "message": "Signed in successfully.",
        "data": {
            "access_token": token,
            "token_type": "Bearer",
            "remember_me": remember_me,
            "user": AuthService.sanitize_user(user),
        },
    }), 200


@auth_bp.route("/auth/verify-email", methods=["POST"])
def verify_email():
    """Verifies a user's email address using their verification token."""
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()

    if not token:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Verification token is missing.",
        }), 400

    user, err = UserModel.verify_email_by_token(token)
    if err:
        return jsonify({
            "success": False,
            "error_type": "VerificationError",
            "message": err,
        }), 400

    return jsonify({
        "success": True,
        "message": "Email verified successfully! You can now sign in to your account.",
        "data": {"user": AuthService.sanitize_user(user)},
    }), 200


@auth_bp.route("/auth/resend-verification", methods=["POST"])
def resend_verification():
    """Issues a fresh email verification token for an unverified account."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    email_ok, email_err = AuthService.validate_email(email)
    if not email_ok:
        return jsonify({"success": False, "message": email_err}), 400

    user = UserModel.find_by_email(email)
    if not user:
        return jsonify({
            "success": True,
            "message": "If an account exists for that email, a verification link has been sent.",
            "data": {},
        }), 200

    if user.get("email_verified"):
        return jsonify({
            "success": True,
            "message": "This email address is already verified. You may sign in.",
            "data": {"already_verified": True},
        }), 200

    token = AuthService.generate_secure_token()
    expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    UserModel.update_verification_token(user["id"], token, expires)

    verify_url = f"{Config.FRONTEND_URL}/verify-email?token={token}"
    email_sent = AuthService.send_auth_email(
        to_email=email,
        subject="Verify your Green Campaign AI account",
        html_body=f"<p>Click to verify your email: <a href='{verify_url}'>{verify_url}</a></p>",
        text_body=f"Verify your account: {verify_url}",
    )

    resp_data = {"email_sent": email_sent}
    if not email_sent and Config.ALLOW_DEV_AUTH_LINKS:
        resp_data["dev_verification_url"] = f"/verify-email?token={token}"
        resp_data["verification_token"] = token

    return jsonify({
        "success": True,
        "message": "A new verification email has been sent.",
        "data": resp_data,
    }), 200


@auth_bp.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Generates a time-limited password reset token and dispatches recovery instructions."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    email_ok, email_err = AuthService.validate_email(email)
    if not email_ok:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": email_err,
            "errors": {"email": email_err},
        }), 400

    user = UserModel.find_by_email(email)
    resp_data = {"email_sent": False}

    if user:
        reset_token = AuthService.generate_secure_token()
        expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        UserModel.set_reset_token(user["id"], reset_token, expires)

        reset_url = f"{Config.FRONTEND_URL}/reset-password?token={reset_token}"
        email_sent = AuthService.send_auth_email(
            to_email=email,
            subject="Reset your Green Campaign AI password",
            html_body=f"<p>Click to reset your password (expires in 1 hour): <a href='{reset_url}'>{reset_url}</a></p>",
            text_body=f"Reset your Green Campaign AI password: {reset_url}",
        )
        resp_data["email_sent"] = email_sent
        if not email_sent and Config.ALLOW_DEV_AUTH_LINKS:
            resp_data["dev_reset_url"] = f"/reset-password?token={reset_token}"
            resp_data["reset_token"] = reset_token

    return jsonify({
        "success": True,
        "message": "If an account with that email exists, password reset instructions have been sent.",
        "data": resp_data,
    }), 200


@auth_bp.route("/auth/reset-password", methods=["POST"])
def reset_password():
    """Validates password reset token, enforces password policy, and updates password hash."""
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    errors = {}
    if not token:
        errors["token"] = "Password reset token is missing."

    pass_ok, pass_err = AuthService.validate_password(new_password)
    if not pass_ok:
        errors["password"] = pass_err

    if new_password != confirm_password:
        errors["confirm_password"] = "Passwords do not match."

    if errors:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Please correct the highlighted errors.",
            "errors": errors,
        }), 400

    new_hash = AuthService.hash_password(new_password)
    user, err = UserModel.reset_password_by_token(token, new_hash)
    if err:
        return jsonify({
            "success": False,
            "error_type": "ResetPasswordError",
            "message": err,
        }), 400

    return jsonify({
        "success": True,
        "message": "Your password has been updated successfully. You can now sign in.",
        "data": {"user": AuthService.sanitize_user(user)},
    }), 200


@auth_bp.route("/auth/me", methods=["GET"])
@require_auth
def get_current_user():
    """Returns the authenticated user's profile."""
    return jsonify({
        "success": True,
        "data": {"user": g.current_user},
    }), 200


@auth_bp.route("/auth/profile", methods=["PUT", "PATCH"])
@require_auth
def update_user_profile():
    """Updates the authenticated user's profile (full_name, avatar_url)."""
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    raw_avatar_url = data.get("avatar_url")

    if not full_name or len(full_name) < 2 or len(full_name) > 120:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Full name must be between 2 and 120 characters.",
            "errors": {"full_name": "Full name must be between 2 and 120 characters."},
        }), 400

    clean_avatar = None
    if raw_avatar_url is not None:
        ok, avatar_res = _validate_avatar_url(str(raw_avatar_url))
        if not ok:
            return jsonify({
                "success": False,
                "error_type": "ValidationError",
                "message": avatar_res,
                "errors": {"avatar_url": avatar_res},
            }), 400
        clean_avatar = avatar_res

    updated = UserModel.update_profile(g.current_user_id, full_name, clean_avatar)
    return jsonify({
        "success": True,
        "message": "Profile updated successfully.",
        "data": {"user": AuthService.sanitize_user(updated)},
    }), 200


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    """Stateless JWT logout confirmation endpoint."""
    return jsonify({
        "success": True,
        "message": "Logged out successfully.",
    }), 200
