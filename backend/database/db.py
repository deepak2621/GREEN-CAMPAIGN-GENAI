import sqlite3
from pathlib import Path
from backend.config import Config

def get_db_connection():
    db_path = Path(Config.DATABASE_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    db_path = Path(Config.DATABASE_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Campaigns table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            campaign_title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            image_style TEXT NOT NULL,
            target_audience TEXT NOT NULL,
            aspect_ratio TEXT NOT NULL,
            generated_prompt TEXT NOT NULL,
            negative_prompt TEXT,
            image_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Safe migrations for existing databases
    for migration_sql in [
        "ALTER TABLE campaigns ADD COLUMN seed INTEGER;",
        "ALTER TABLE campaigns ADD COLUMN user_id TEXT;"
    ]:
        try:
            cursor.execute(migration_sql)
        except Exception:
            pass

    # Authentication users table (for local JWT auth & profile sync)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email_verified INTEGER NOT NULL DEFAULT 0,
            verification_token TEXT,
            verification_token_expires TIMESTAMP,
            reset_token TEXT,
            reset_token_expires TIMESTAMP,
            auth_provider TEXT NOT NULL DEFAULT 'local',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # User profiles table matching Supabase profiles structure
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            avatar_url TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)

    # Create indexes for fast lookup and query optimization
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);")

    conn.commit()
    conn.close()
