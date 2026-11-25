import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, g
from backend.services.prompt_builder import build_prompt
from backend.services.auth_service import require_auth
from backend.services.image_generator import (
    image_generator_service,
    GenerationError,
    ConfigurationError,
    RateLimitError,
    ServiceBusyError,
    CudaOOMError,
    ModelNotReadyError,
)
from backend.config import Config
from backend.services.model_config import Flux1DevConfig

generation_bp = Blueprint("generation", __name__)
logger = logging.getLogger("green_campaign_ai")

ALLOWED_CATEGORIES = [
    "Water Conservation",
    "Energy Conservation",
    "Renewable Energy",
    "Climate Awareness",
    "Waste Management",
    "Pollution Control",
    "Sustainable Living",
]

ALLOWED_STYLES = [
    "Realistic Photography",
    "3D Illustration",
    "Digital Art",
    "Flat Vector Illustration",
    "Educational Infographic Illustration",
    "Cartoon Illustration",
]

ALLOWED_AUDIENCES = [
    "General Public",
    "Students",
    "Children",
    "Households",
    "Industrial Consumers",
]

ALLOWED_ASPECT_RATIOS = ["1:1", "4:5", "16:9"]
ALLOWED_PRESETS = ["fast", "quality"]


def _validate_and_build_generation_inputs(data: dict):
    campaign_title = (data.get("campaign_title") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "").strip()
    image_style = (data.get("image_style") or "").strip()
    target_audience = (data.get("target_audience") or "").strip()
    aspect_ratio = (data.get("aspect_ratio") or "1:1").strip()
    preset = (data.get("preset") or Flux1DevConfig.DEFAULT_PRESET).strip().lower()
    additional_instructions = (data.get("additional_instructions") or "").strip()
    custom_prompt = (data.get("custom_prompt") or "").strip()

    errors = {}
    if not custom_prompt:
        if not campaign_title:
            errors["campaign_title"] = "Campaign theme or title is required."
        elif len(campaign_title) > 200:
            errors["campaign_title"] = "Campaign title must be 200 characters or fewer."

        if not description:
            errors["description"] = "Campaign description is required."
        elif len(description) > 1500:
            errors["description"] = "Description must be 1500 characters or fewer."
    else:
        if len(custom_prompt) > 2000:
            errors["custom_prompt"] = "Custom prompt must be 2000 characters or fewer."
        if not campaign_title:
            campaign_title = custom_prompt[:60]
        if not description:
            description = custom_prompt

    if not category:
        errors["category"] = "Campaign category is required."
    elif category not in ALLOWED_CATEGORIES:
        errors["category"] = f"Invalid category. Must be one of: {', '.join(ALLOWED_CATEGORIES)}"

    if not image_style:
        errors["image_style"] = "Image style is required."
    elif image_style not in ALLOWED_STYLES:
        errors["image_style"] = f"Invalid style. Must be one of: {', '.join(ALLOWED_STYLES)}"

    if not target_audience:
        errors["target_audience"] = "Target audience is required."
    elif target_audience not in ALLOWED_AUDIENCES:
        errors["target_audience"] = f"Invalid target audience. Must be one of: {', '.join(ALLOWED_AUDIENCES)}"

    if len(additional_instructions) > 500:
        errors["additional_instructions"] = "Art direction notes must be 500 characters or fewer."

    if aspect_ratio not in ALLOWED_ASPECT_RATIOS:
        aspect_ratio = "1:1"
    if preset not in ALLOWED_PRESETS:
        preset = Flux1DevConfig.DEFAULT_PRESET

    raw_seed = data.get("seed")
    if raw_seed is not None and str(raw_seed).strip() != "":
        s_str = str(raw_seed).strip()
        if not s_str.isdigit() or int(s_str) > 2 ** 32 - 1:
            errors["seed"] = "Seed must be a positive integer between 0 and 4294967295."

    if errors:
        return None, errors

    prompt_data = build_prompt(
        theme=campaign_title,
        description=description,
        category=category,
        image_style=image_style,
        target_audience=target_audience,
        aspect_ratio=aspect_ratio,
        additional_instructions=additional_instructions,
        preset=preset,
        custom_prompt=custom_prompt,
    )

    if data.get("custom_negative_prompt") and str(data.get("custom_negative_prompt")).strip():
        prompt_data["negative_prompt"] = str(data.get("custom_negative_prompt")).strip()[:500]
    if raw_seed is not None and str(raw_seed).strip() != "":
        prompt_data["seed"] = int(str(raw_seed).strip())

    meta = {
        "campaign_title": campaign_title,
        "description": description,
        "category": category,
        "image_style": image_style,
        "target_audience": target_audience,
        "aspect_ratio": aspect_ratio,
        "additional_instructions": additional_instructions,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return (prompt_data, meta), None


def _map_generation_error(err: Exception):
    if isinstance(err, RateLimitError):
        return jsonify({
            "success": False,
            "error_type": "RateLimitError",
            "rate_limited": True,
            "retry_after": err.retry_after,
            "message": str(err),
        }), 429
    if isinstance(err, ServiceBusyError):
        return jsonify({
            "success": False,
            "error_type": "ServiceBusyError",
            "message": str(err),
        }), 409
    if isinstance(err, ConfigurationError):
        return jsonify({
            "success": False,
            "error_type": "ConfigurationError",
            "message": str(err),
        }), 422
    if isinstance(err, CudaOOMError):
        return jsonify({
            "success": False,
            "error_type": "CudaOOMError",
            "message": str(err),
        }), 507
    if isinstance(err, ModelNotReadyError):
        return jsonify({
            "success": False,
            "error_type": "ModelNotReadyError",
            "message": str(err),
        }), 503
    if isinstance(err, GenerationError):
        return jsonify({
            "success": False,
            "error_type": "GenerationError",
            "message": str(err),
        }), 502
    logger.exception("Unexpected error during image generation")
    return jsonify({
        "success": False,
        "error_type": "InternalError",
        "message": "Unexpected server error during image generation.",
    }), 500


@generation_bp.route("/generate", methods=["POST"])
@require_auth
def generate_campaign_image():
    """Synchronous FLUX.1 Dev Q4 GGUF image generation endpoint."""
    data = request.get_json(silent=True) or {}
    parsed, errors = _validate_and_build_generation_inputs(data)
    if errors:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Please correct the highlighted form errors.",
            "errors": errors,
        }), 400

    prompt_data, meta = parsed
    try:
        result = image_generator_service.generate(prompt_data)
        return jsonify({
            "success": True,
            "data": {
                **meta,
                "generated_prompt": prompt_data["prompt"],
                "negative_prompt": prompt_data["negative_prompt"],
                "seed": result.get("seed"),
                "model": result.get("model", Flux1DevConfig.MODEL_NAME),
                "developer": result.get("developer", Flux1DevConfig.DEVELOPER),
                "architecture": result.get("architecture", Flux1DevConfig.ARCHITECTURE),
                "quantization": result.get("quantization", Flux1DevConfig.QUANTIZATION),
                "license": result.get("license", Flux1DevConfig.LICENSE),
                "preset": result.get("preset", prompt_data["preset"]),
                "preset_label": result.get("preset_label"),
                "steps": result.get("steps"),
                "guidance_scale": result.get("guidance_scale"),
                "sampler": result.get("sampler"),
                "scheduler": result.get("scheduler"),
                "model_load_time_sec": result.get("model_load_time_sec"),
                "generation_time_sec": result.get("generation_time_sec"),
                "image_url": f"/api/images/{result['filename']}",
                "download_url": f"/api/images/{result['filename']}/download",
                "filename": result["filename"],
                "file_path": result["file_path"],
                "width": result["width"],
                "height": result["height"],
                "file_size": result["file_size"],
            },
        }), 200
    except Exception as e:
        return _map_generation_error(e)


@generation_bp.route("/generate/start", methods=["POST"])
@require_auth
def start_async_generation():
    """Asynchronous FLUX.1 Dev generation start endpoint with live step progress."""
    data = request.get_json(silent=True) or {}
    parsed, errors = _validate_and_build_generation_inputs(data)
    if errors:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Please correct the highlighted form errors.",
            "errors": errors,
        }), 400

    prompt_data, meta = parsed
    try:
        job = image_generator_service.start_job(prompt_data, metadata=meta, user_id=g.current_user_id)
        return jsonify({"success": True, "data": job}), 202
    except Exception as e:
        return _map_generation_error(e)


@generation_bp.route("/generate/status/<job_id>", methods=["GET"])
@require_auth
def get_generation_status(job_id):
    """Returns real-time ComfyUI WebSocket progress and result for an async generation job."""
    job = image_generator_service.get_job(job_id)
    if not job:
        return jsonify({"success": False, "message": "Generation job not found."}), 404
    if job.get("user_id") and job["user_id"] != g.current_user_id:
        return jsonify({"success": False, "message": "Access denied for this generation job."}), 403
    return jsonify({"success": True, "data": job}), 200


@generation_bp.route("/generate/cancel/<job_id>", methods=["POST"])
@require_auth
def cancel_generation(job_id):
    """Interrupts and cancels an active or queued generation job."""
    ok, msg = image_generator_service.cancel_job(job_id, user_id=g.current_user_id)
    if not ok:
        status_code = 403 if "permission" in msg.lower() else 404 if "not found" in msg.lower() else 400
        return jsonify({"success": False, "message": msg}), status_code
    return jsonify({"success": True, "message": msg}), 200


@generation_bp.route("/preview-prompt", methods=["POST"])
@require_auth
def preview_campaign_prompt():
    """Returns exact FLUX.1 Dev prompt, model config, and preset parameters before generation."""
    data = request.get_json(silent=True) or {}

    campaign_title = (data.get("campaign_title") or "").strip() or "Sustainability Education"
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "Water Conservation").strip()
    image_style = (data.get("image_style") or "Realistic Photography").strip()
    target_audience = (data.get("target_audience") or "General Public").strip()
    aspect_ratio = (data.get("aspect_ratio") or "1:1").strip()
    preset_id = (data.get("preset") or Flux1DevConfig.DEFAULT_PRESET).strip().lower()
    additional_instructions = (data.get("additional_instructions") or "").strip()
    custom_prompt = (data.get("custom_prompt") or "").strip()

    prompt_data = build_prompt(
        theme=campaign_title,
        description=description,
        category=category,
        image_style=image_style,
        target_audience=target_audience,
        aspect_ratio=aspect_ratio,
        additional_instructions=additional_instructions,
        preset=preset_id,
        custom_prompt=custom_prompt,
    )

    preset = Flux1DevConfig.get_preset(preset_id)
    seed_val = data.get("seed")
    seed_display = "Auto-generated random integer" if (seed_val is None or str(seed_val).strip() == "") else seed_val

    return jsonify({
        "success": True,
        "data": {
            "prompt": prompt_data["prompt"],
            "negative_prompt": prompt_data["negative_prompt"],
            "structured_components": prompt_data.get("structured_components", {}),
            "model_info": Flux1DevConfig.get_info(preset_id=preset["id"]),
            "parameters": {
                "width": prompt_data["dimensions"]["width"],
                "height": prompt_data["dimensions"]["height"],
                "aspect_ratio": aspect_ratio,
                "preset": preset["id"],
                "preset_label": preset["label"],
                "seed": seed_display,
                "inference_steps": preset["steps"],
                "guidance_scale": preset["guidance"],
                "cfg_scale": preset["cfg"],
                "sampler": preset["sampler"],
                "scheduler": preset["scheduler"],
            },
            "original_inputs": {
                "campaign_title": data.get("campaign_title", ""),
                "description": description,
                "category": category,
                "image_style": image_style,
                "target_audience": target_audience,
                "aspect_ratio": aspect_ratio,
                "preset": preset["id"],
            },
        },
    }), 200


@generation_bp.route("/model-status", methods=["GET"])
def get_model_status():
    """Returns status and configuration for FLUX.1 Dev Q4 GGUF."""
    preset = request.args.get("preset", Flux1DevConfig.DEFAULT_PRESET)
    return jsonify({
        "success": True,
        "data": Flux1DevConfig.get_info(preset_id=preset),
    }), 200


@generation_bp.route("/system-metrics", methods=["GET"])
@require_auth
def get_system_metrics():
    """Returns real-time GPU, VRAM, System RAM, and generation timing metrics."""
    return jsonify({
        "success": True,
        "data": image_generator_service.get_system_metrics(),
    }), 200


@generation_bp.route("/cooldown", methods=["GET"])
def get_cooldown():
    """Returns remaining cooldown seconds (0 for local ComfyUI)."""
    remaining = image_generator_service.get_cooldown_remaining()
    return jsonify({
        "success": True,
        "cooldown_remaining": remaining,
        "ready": remaining == 0,
    }), 200


@generation_bp.route("/images/<filename>", methods=["GET"])
def get_image(filename):
    """Serves the generated PNG image safely from GENERATED_IMAGES_DIR."""
    safe_filename = os.path.basename(filename)
    allowed_dir = Path(Config.GENERATED_IMAGES_DIR).resolve()
    file_path = (allowed_dir / safe_filename).resolve()

    if not file_path.is_relative_to(allowed_dir) or not file_path.is_file():
        return jsonify({"success": False, "message": "Image not found."}), 404

    return send_file(str(file_path), mimetype="image/png", as_attachment=False)


@generation_bp.route("/images/<filename>/download", methods=["GET"])
def download_image(filename):
    """Forces browser download of the generated PNG image safely."""
    safe_filename = os.path.basename(filename)
    allowed_dir = Path(Config.GENERATED_IMAGES_DIR).resolve()
    file_path = (allowed_dir / safe_filename).resolve()

    if not file_path.is_relative_to(allowed_dir) or not file_path.is_file():
        return jsonify({"success": False, "message": "Image not found."}), 404

    return send_file(
        str(file_path),
        mimetype="image/png",
        as_attachment=True,
        download_name=safe_filename,
    )
