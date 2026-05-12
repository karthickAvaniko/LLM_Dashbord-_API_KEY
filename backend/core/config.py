"""
Configuration — production-hardened.
Critical secrets MUST be set via environment variables.
"""
import os
import secrets as _secrets
import sys
from pathlib import Path

# Load .env file if present (local dev convenience)
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
if _ENV_FILE.exists():
    for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_IS_RUNPOD = os.path.isdir("/workspace")
_BASE = "/workspace" if _IS_RUNPOD else os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# Differentiate dev vs prod by ENV var. Prod = stricter.
APP_ENV = os.getenv("APP_ENV", "development").lower()  # development | staging | production


def _require(key: str, hint: str = ""):
    """Force a critical secret to be set. Fail loud in production."""
    val = os.getenv(key)
    if val and val.strip() and "change" not in val.lower() and "your_" not in val.lower():
        return val
    if APP_ENV == "production":
        sys.stderr.write(
            f"\n[FATAL] Missing or default value for required env var: {key}\n"
            f"        {hint}\n"
            f"        APP_ENV=production refuses to start with weak/default secrets.\n\n"
        )
        sys.exit(1)
    # Dev fallback — generate ephemeral secret + warn loudly
    if val is None or not val.strip():
        val = _secrets.token_urlsafe(32)
        sys.stderr.write(
            f"[warn] {key} not set — generated ephemeral value for dev only. "
            f"Tokens won't persist across restarts.\n"
        )
    elif "change" in val.lower() or "your_" in val.lower():
        sys.stderr.write(
            f"[warn] {key} still has default placeholder value. "
            f"Replace before APP_ENV=production.\n"
        )
    return val


class Settings:
    PROJECT_NAME: str = "Avaniko AI API Gateway"
    APP_ENV: str = APP_ENV

    # vLLM
    VLLM_URL: str = os.getenv("VLLM_URL", "http://localhost:8000")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "qwen3.6-35b")
    MODEL_DISPLAY_NAME: str = os.getenv("MODEL_DISPLAY_NAME", "Qwen3.6-35B-A3B")

    # Secrets (production: must come from env, no defaults)
    JWT_SECRET: str = _require("JWT_SECRET", "Generate with: openssl rand -hex 32")
    JWT_ALGORITHM: str = "HS256"
    ADMIN_SECRET: str = _require("ADMIN_SECRET", "Strong random for admin operations")

    # Admin seed credentials — only used on first DB init
    # In production, set ADMIN_PASSWORD; otherwise a random one is generated and printed
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "karthick.murugan@avaniko.com")
    ADMIN_NAME: str = os.getenv("ADMIN_NAME", "Karthick Murugan")
    _seed_pw = os.getenv("ADMIN_PASSWORD")
    if _seed_pw and "change" not in _seed_pw.lower() and len(_seed_pw) >= 8:
        ADMIN_PASSWORD: str = _seed_pw
    else:
        if APP_ENV == "production":
            sys.stderr.write(
                "\n[FATAL] ADMIN_PASSWORD not set or too weak (need >=8 chars, no 'change_me').\n"
                "        APP_ENV=production refuses to start with weak admin password.\n\n"
            )
            sys.exit(1)
        ADMIN_PASSWORD: str = _seed_pw or "Avan@123"  # dev only

    # Storage
    DB_PATH: str = os.getenv("DB_PATH", os.path.join(_BASE, "storage", "gateway_v2.db"))
    DIST_DIR: str = os.path.join(_BASE, "dist")

    # Pricing (per 1000 tokens)
    PRICE_PROMPT_1K: float = float(os.getenv("PRICE_PROMPT_1K", "0.0015"))
    PRICE_COMPLETION_1K: float = float(os.getenv("PRICE_COMPLETION_1K", "0.0020"))

    # Limits / safety
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    DEFAULT_RATE_PER_MIN: int = int(os.getenv("DEFAULT_RATE_PER_MIN", "10"))
    DEFAULT_RATE_PER_DAY: int = int(os.getenv("DEFAULT_RATE_PER_DAY", "500"))


settings = Settings()

# Friendly startup banner
sys.stderr.write(
    f"\n[Avaniko AI Gateway] APP_ENV={settings.APP_ENV} | model={settings.MODEL_NAME} | "
    f"vLLM={settings.VLLM_URL}\n"
)
if settings.APP_ENV != "production":
    sys.stderr.write("[note] running in dev mode — secrets relaxed. Set APP_ENV=production for strict checks.\n\n")
else:
    sys.stderr.write("[ok] production mode — all secrets validated.\n\n")
