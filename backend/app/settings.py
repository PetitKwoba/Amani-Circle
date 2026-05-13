import os


class Settings:
    database_url = os.getenv("AMANI_DATABASE_URL", "sqlite:///./amani_circle.sqlite3")
    session_secret = os.getenv("AMANI_SESSION_SECRET", "replace-this-session-secret-before-deploying")
    session_cookie_name = os.getenv("AMANI_SESSION_COOKIE_NAME", "amani_responder_session")
    session_ttl_seconds = int(os.getenv("AMANI_SESSION_TTL_SECONDS", "28800"))
    session_cookie_secure = os.getenv("AMANI_SESSION_COOKIE_SECURE", "false").lower() == "true"
    bootstrap_admin_username = os.getenv("AMANI_BOOTSTRAP_ADMIN_USERNAME", "admin")
    bootstrap_admin_email = os.getenv("AMANI_BOOTSTRAP_ADMIN_EMAIL", "admin@example.test")
    bootstrap_admin_password = os.getenv("AMANI_BOOTSTRAP_ADMIN_PASSWORD", "amani-admin-dev-password")
    default_responder_username = os.getenv("AMANI_DEFAULT_RESPONDER_USERNAME", "responder")
    default_responder_email = os.getenv("AMANI_DEFAULT_RESPONDER_EMAIL", "responder@example.test")
    default_responder_password = os.getenv("AMANI_DEFAULT_RESPONDER_PASSWORD", "amani-responder-dev")
    followup_rate_limit_window_seconds = int(os.getenv("AMANI_FOLLOWUP_RATE_WINDOW_SECONDS", "300"))
    followup_rate_limit_attempts = int(os.getenv("AMANI_FOLLOWUP_RATE_ATTEMPTS", "5"))
    public_bucket_threshold = int(os.getenv("AMANI_PUBLIC_BUCKET_THRESHOLD", "3"))
    dashboard_base_url = os.getenv("AMANI_DASHBOARD_BASE_URL", "http://127.0.0.1:5173/#responder")
    media_upload_dir = os.getenv("AMANI_MEDIA_UPLOAD_DIR", "./media_uploads")
    media_max_upload_bytes = int(os.getenv("AMANI_MEDIA_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    media_dev_mark_clean = os.getenv("AMANI_MEDIA_DEV_MARK_CLEAN", "true").lower() == "true"


settings = Settings()
