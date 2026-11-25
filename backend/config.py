import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the backend
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "green-campaign-ai-secret-key-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "database" / "campaigns.db"))
    GENERATED_IMAGES_DIR = os.getenv("GENERATED_IMAGES_DIR", str(BASE_DIR / "generated_images"))
    
    # AI Image Generation Provider: 'local_comfyui' (FLUX.2 Klein 4B Q4)
    IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "local_comfyui").lower()
    
    # Optional Supabase Auth configuration for backend JWT verification
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

    # Optional SMTP email configuration for local auth mode
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@greencampaign.ai")

    # Legacy keys retained cleanly via env
    HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY", "")
    HF_MODEL = os.getenv("HF_MODEL", "black-forest-labs/FLUX.1-schnell")
    POLLINATIONS_API_KEY = os.getenv("POLLINATIONS_API_KEY", "")
    STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max request size
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
