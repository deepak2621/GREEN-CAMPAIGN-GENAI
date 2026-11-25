import os
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, current_app, g
from backend.services.prompt_builder import build_prompt
from backend.services.auth_service import require_auth
from backend.services.image_generator import (
    ImageGeneratorService, 
    GenerationError, 
    ConfigurationError,
    RateLimitError,
    ServiceBusyError
)
from backend.database.models import CampaignModel
from backend.config import Config
from backend.services.model_config import Flux2KleinConfig

generation_bp = Blueprint("generation", __name__)
generator_service = ImageGeneratorService()

ALLOWED_CATEGORIES = [
    "Water Conservation",
    "Energy Conservation",
    "Renewable Energy",
    "Climate Awareness",
    "Waste Management",
    "Pollution Control",
    "Sustainable Living"
]

ALLOWED_STYLES = [
    "Realistic Photography",
    "3D Illustration",
    "Digital Art",
    "Flat Vector Illustration",
    "Educational Infographic Illustration",
    "Cartoon Illustration"
]

ALLOWED_AUDIENCES = [
    "General Public",
    "Students",
    "Children",
    "Households",
    "Industrial Consumers"
]

ALLOWED_ASPECT_RATIOS = ["1:1", "4:5", "16:9"]

@generation_bp.route("/generate", methods=["POST"])
@require_auth
def generate_campaign_image():
    """
    Accepts campaign inputs, validates required fields, generates real AI visual using FLUX.2 Klein 4B Q4,
    and returns image URL and prompt metadata.
    """
    data = request.get_json(silent=True) or {}
    
    # Required Field Validations
    campaign_title = data.get("campaign_title", "").strip()
    description = data.get("description", "").strip()
    category = data.get("category", "").strip()
    image_style = data.get("image_style", "").strip()
    target_audience = data.get("target_audience", "").strip()
    aspect_ratio = data.get("aspect_ratio", "1:1").strip()
    additional_instructions = data.get("additional_instructions", "").strip()

    errors = {}
    if not campaign_title:
        errors["campaign_title"] = "Campaign theme or title is required."
    if not description:
        errors["description"] = "Campaign description is required."
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
    if aspect_ratio not in ALLOWED_ASPECT_RATIOS:
        aspect_ratio = "1:1"

    if errors:
        return jsonify({
            "success": False,
            "error_type": "ValidationError",
            "message": "Please correct the highlighted form errors.",
            "errors": errors
        }), 400

    try:
        # 1. Construct rich diffusion prompt for FLUX.2 Klein 4B
        prompt_data = build_prompt(
            theme=campaign_title,
            description=description,
            category=category,
            image_style=image_style,
            target_audience=target_audience,
            aspect_ratio=aspect_ratio,
            additional_instructions=additional_instructions
        )

        # Allow user overrides if advanced editing was used
        if data.get("custom_prompt") and data.get("custom_prompt").strip():
            prompt_data["prompt"] = data.get("custom_prompt").strip()
        if data.get("custom_negative_prompt") and data.get("custom_negative_prompt").strip():
            prompt_data["negative_prompt"] = data.get("custom_negative_prompt").strip()
        if data.get("seed") is not None and str(data.get("seed")).strip() != "":
            prompt_data["seed"] = data.get("seed")

        # 2. Generate actual FLUX.2 Klein diffusion image
        result = generator_service.generate(prompt_data)

        # 3. Formulate response payload
        image_url = f"/api/images/{result['filename']}"
        download_url = f"/api/images/{result['filename']}/download"
        created_at_str = datetime.now(timezone.utc).isoformat()

        return jsonify({
            "success": True,
            "data": {
                "campaign_title": campaign_title,
                "description": description,
                "category": category,
                "image_style": image_style,
                "target_audience": target_audience,
                "aspect_ratio": aspect_ratio,
                "additional_instructions": additional_instructions,
                "generated_prompt": prompt_data["prompt"],
                "negative_prompt": prompt_data["negative_prompt"],
                "seed": result.get("seed"),
                "model": result.get("model", Flux2KleinConfig.MODEL_NAME),
                "quantization": result.get("quantization", Flux2KleinConfig.QUANTIZATION),
                "license": result.get("license", Flux2KleinConfig.LICENSE),
                "image_url": image_url,
                "download_url": download_url,
                "filename": result["filename"],
                "file_path": result["file_path"],
                "width": result["width"],
                "height": result["height"],
                "file_size": result["file_size"],
                "created_at": created_at_str
            }
        }), 200

    except RateLimitError as rle:
        return jsonify({
            "success": False,
            "error_type": "RateLimitError",
            "rate_limited": True,
            "retry_after": rle.retry_after,
            "message": str(rle)
        }), 429
    except ServiceBusyError as sbe:
        return jsonify({
            "success": False,
            "error_type": "ServiceBusyError",
            "message": str(sbe)
        }), 503
    except ConfigurationError as ce:
        return jsonify({
            "success": False,
            "error_type": "ConfigurationError",
            "message": str(ce)
        }), 422
    except GenerationError as ge:
        return jsonify({
            "success": False,
            "error_type": "GenerationError",
            "message": str(ge)
        }), 502
    except Exception as e:
        return jsonify({
            "success": False,
            "error_type": "InternalError",
            "message": f"Unexpected server error during image generation: {str(e)}"
        }), 500

@generation_bp.route("/preview-prompt", methods=["POST"])
@require_auth
def preview_campaign_prompt():
    """
    Accepts campaign form inputs and generates the exact structured prompt,
    negative prompt, active model info, and generation parameters without calling the diffusion model.
    Used by the development prompt debugger in the frontend.
    """
    data = request.get_json(silent=True) or {}
    
    campaign_title = data.get("campaign_title", "").strip() or "Sustainability Education"
    description = data.get("description", "").strip()
    category = data.get("category", "Water Conservation").strip()
    image_style = data.get("image_style", "3D Illustration").strip()
    target_audience = data.get("target_audience", "General Public").strip()
    aspect_ratio = data.get("aspect_ratio", "1:1").strip()
    additional_instructions = data.get("additional_instructions", "").strip()

    prompt_data = build_prompt(
        theme=campaign_title,
        description=description,
        category=category,
        image_style=image_style,
        target_audience=target_audience,
        aspect_ratio=aspect_ratio,
        additional_instructions=additional_instructions
    )

    seed_val = data.get("seed")
    if seed_val is None or str(seed_val).strip() == "":
        seed_display = "Auto-generated random integer"
    else:
        seed_display = seed_val

    return jsonify({
        "success": True,
        "data": {
            "prompt": prompt_data["prompt"],
            "negative_prompt": prompt_data["negative_prompt"],
            "structured_components": prompt_data.get("structured_components", {}),
            "model_info": Flux2KleinConfig.get_info(),
            "parameters": {
                "width": prompt_data["dimensions"]["width"],
                "height": prompt_data["dimensions"]["height"],
                "aspect_ratio": aspect_ratio,
                "seed": seed_display,
                "inference_steps": Flux2KleinConfig.INFERENCE_STEPS,
                "cfg_scale": Flux2KleinConfig.CFG_SCALE,
                "sampler": Flux2KleinConfig.SAMPLER_NAME,
                "scheduler": Flux2KleinConfig.SCHEDULER
            },
            "original_inputs": {
                "campaign_title": data.get("campaign_title", ""),
                "description": description,
                "category": category,
                "image_style": image_style,
                "target_audience": target_audience,
                "aspect_ratio": aspect_ratio
            }
        }
    }), 200

@generation_bp.route("/model-status", methods=["GET"])
def get_model_status():
    """Returns status and configuration for FLUX.2 Klein 4B Q4."""
    return jsonify({
        "success": True,
        "data": Flux2KleinConfig.get_info()
    }), 200

@generation_bp.route("/cooldown", methods=["GET"])
def get_cooldown():
    """Returns the remaining cooldown seconds for free anonymous diffusion requests."""
    remaining = generator_service.get_cooldown_remaining()
    return jsonify({
        "success": True,
        "cooldown_remaining": remaining,
        "ready": remaining == 0
    }), 200

@generation_bp.route("/images/<filename>", methods=["GET"])
def get_image(filename):
    """Serves the generated PNG image."""
    safe_filename = os.path.basename(filename)
    file_path = Path(Config.GENERATED_IMAGES_DIR) / safe_filename
    
    if not file_path.is_file():
        return jsonify({"success": False, "message": "Image not found."}), 404
        
    return send_file(
        str(file_path),
        mimetype="image/png",
        as_attachment=False
    )

@generation_bp.route("/images/<filename>/download", methods=["GET"])
def download_image(filename):
    """Forces browser download of the generated PNG image."""
    safe_filename = os.path.basename(filename)
    file_path = Path(Config.GENERATED_IMAGES_DIR) / safe_filename
    
    if not file_path.is_file():
        return jsonify({"success": False, "message": "Image not found."}), 404
        
    return send_file(
        str(file_path),
        mimetype="image/png",
        as_attachment=True,
        download_name=safe_filename
    )
