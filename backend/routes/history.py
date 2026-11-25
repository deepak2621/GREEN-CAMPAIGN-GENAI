from flask import Blueprint, request, jsonify, g
from backend.database.models import CampaignModel
from backend.services.auth_service import require_auth

history_bp = Blueprint("history", __name__)

@history_bp.route("/history", methods=["GET"])
@history_bp.route("/campaigns", methods=["GET"])
@require_auth
def get_campaign_history():
    """
    Returns stored campaigns for the authenticated user ordered by creation date descending.
    """
    try:
        campaigns = CampaignModel.get_all(user_id=g.current_user_id)
        for item in campaigns:
            if item.get("filename"):
                item["image_url"] = f"/api/images/{item['filename']}"
                item["download_url"] = f"/api/images/{item['filename']}/download"
            else:
                item["image_url"] = ""
                item["download_url"] = ""

        return jsonify({
            "success": True,
            "count": len(campaigns),
            "data": campaigns
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to retrieve history: {str(e)}"
        }), 500

@history_bp.route("/history", methods=["POST"])
@history_bp.route("/campaigns", methods=["POST"])
@require_auth
def save_campaign():
    """
    Saves campaign metadata to history scoped to the authenticated user.
    Detects and prevents duplicate history entries.
    """
    data = request.get_json(silent=True) or {}

    if not data.get("image_path") and data.get("file_path"):
        data["image_path"] = data.get("file_path")
    if not data.get("image_path") and data.get("image_url"):
        data["image_path"] = data.get("image_url")

    required_keys = ["campaign_title", "description", "category", "image_style", "image_path"]
    missing = [k for k in required_keys if not data.get(k)]
    if missing:
        return jsonify({
            "success": False,
            "message": f"Missing required fields: {', '.join(missing)}"
        }), 400

    try:
        data["user_id"] = g.current_user_id
        saved_id = CampaignModel.create(data)
        record = CampaignModel.get_by_id(saved_id, user_id=g.current_user_id)
        if record:
            record["image_url"] = f"/api/images/{record['filename']}"
            record["download_url"] = f"/api/images/{record['filename']}/download"

        return jsonify({
            "success": True,
            "message": "Campaign successfully saved to history.",
            "data": record
        }), 201
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to save campaign: {str(e)}"
        }), 500

@history_bp.route("/history/<campaign_id>", methods=["GET"])
@require_auth
def get_campaign_detail(campaign_id):
    """
    Retrieves a single campaign by ID belonging to the authenticated user.
    """
    record = CampaignModel.get_by_id(campaign_id, user_id=g.current_user_id)
    if not record:
        return jsonify({"success": False, "message": "Campaign not found."}), 404

    record["image_url"] = f"/api/images/{record['filename']}"
    record["download_url"] = f"/api/images/{record['filename']}/download"
    return jsonify({"success": True, "data": record}), 200

@history_bp.route("/history/<campaign_id>", methods=["DELETE"])
@require_auth
def delete_campaign(campaign_id):
    """
    Deletes campaign record owned by the authenticated user and removes associated image file.
    """
    success, message = CampaignModel.delete(campaign_id, user_id=g.current_user_id)
    if not success:
        status_code = 403 if "permission" in message.lower() else 404
        return jsonify({"success": False, "message": message}), status_code

    return jsonify({"success": True, "message": message}), 200
