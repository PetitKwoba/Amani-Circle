import os


class Settings:
    database_url = os.getenv("AMANI_DATABASE_URL", "sqlite:///./amani_circle.sqlite3")
    responder_username = os.getenv("AMANI_RESPONDER_USERNAME", "responder")
    responder_password = os.getenv("AMANI_RESPONDER_PASSWORD", "amani-responder-dev")
    session_secret = os.getenv("AMANI_SESSION_SECRET", "replace-this-session-secret-before-deploying")
    session_cookie_name = os.getenv("AMANI_SESSION_COOKIE_NAME", "amani_responder_session")
    session_ttl_seconds = int(os.getenv("AMANI_SESSION_TTL_SECONDS", "28800"))
    session_cookie_secure = os.getenv("AMANI_SESSION_COOKIE_SECURE", "false").lower() == "true"
    followup_rate_limit_window_seconds = int(os.getenv("AMANI_FOLLOWUP_RATE_WINDOW_SECONDS", "300"))
    followup_rate_limit_attempts = int(os.getenv("AMANI_FOLLOWUP_RATE_ATTEMPTS", "5"))
    public_bucket_threshold = int(os.getenv("AMANI_PUBLIC_BUCKET_THRESHOLD", "3"))


settings = Settings()
