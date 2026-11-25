import os
from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database.db import init_db
from backend.routes.generation import generation_bp
from backend.routes.history import history_bp
from backend.routes.auth import auth_bp
from backend.services.model_config import Flux2KleinConfig

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable Cross-Origin Resource Sharing including Authorization header
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # Initialize SQLite database
    init_db()

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(generation_bp, url_prefix="/api")
    app.register_blueprint(history_bp, url_prefix="/api")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint confirming API availability and FLUX.2 Klein 4B Q4 model configuration."""
        checkpoint_ready = Flux2KleinConfig.is_checkpoint_available()
        status_text = "Ready" if checkpoint_ready else "Model Not Available"

        return jsonify({
            "status": "healthy",
            "app_name": "Green Campaign AI",
            "version": "1.0.0",
            "provider": Flux2KleinConfig.PROVIDER,
            "provider_ready": checkpoint_ready,
            "provider_note": "Active generation model: FLUX.2 Klein 4B Q4 (Distilled GGUF)",
            "model": Flux2KleinConfig.MODEL_NAME,
            "model_status": status_text,
            "quantization": Flux2KleinConfig.QUANTIZATION,
            "unet": Flux2KleinConfig.UNET_NAME,
            "clip": Flux2KleinConfig.CLIP_NAME,
            "vae": Flux2KleinConfig.VAE_NAME,
            "resolution": f"{Flux2KleinConfig.DEFAULT_WIDTH}x{Flux2KleinConfig.DEFAULT_HEIGHT}",
            "inference_steps": Flux2KleinConfig.INFERENCE_STEPS,
            "cfg_scale": Flux2KleinConfig.CFG_SCALE,
            "execution": Flux2KleinConfig.EXECUTION_PROFILE,
            "license": Flux2KleinConfig.LICENSE,
            "speed_target": Flux2KleinConfig.SPEED_TARGET,
            "database": "sqlite",
            "storage_ready": os.path.isdir(Config.GENERATED_IMAGES_DIR)
        }), 200

    @app.route("/api/config", methods=["GET"])
    def get_app_config():
        """Returns campaign generation metadata options."""
        return jsonify({
            "categories": [
                "Water Conservation",
                "Energy Conservation",
                "Renewable Energy",
                "Climate Awareness",
                "Waste Management",
                "Pollution Control",
                "Sustainable Living"
            ],
            "styles": [
                "Realistic Photography",
                "3D Illustration",
                "Digital Art",
                "Flat Vector Illustration",
                "Educational Infographic Illustration",
                "Cartoon Illustration"
            ],
            "audiences": [
                "General Public",
                "Students",
                "Children",
                "Households",
                "Industrial Consumers"
            ],
            "aspect_ratios": [
                {"ratio": "1:1", "label": "Square (1:1)", "width": 512, "height": 512},
                {"ratio": "4:5", "label": "Portrait (4:5)", "width": 512, "height": 640},
                {"ratio": "16:9", "label": "Landscape (16:9)", "width": 640, "height": 384}
            ],
            "current_provider": Flux2KleinConfig.PROVIDER
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Green Campaign AI Backend on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
