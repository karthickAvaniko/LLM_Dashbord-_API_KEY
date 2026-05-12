#!/bin/bash
# ════════════════════════════════════════════════════════════════
# Avaniko AI Gateway — Pod Setup Script
# Run this INSIDE the RunPod pod:  bash setup_backend_in_pod.sh
# ════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR=/workspace/llmDashboard
echo "📁 Setting up at: $PROJECT_DIR"

# Cleanup wrong-location folders
rm -rf /backend /storage 2>/dev/null || true

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Folder structure
mkdir -p backend/api/routes backend/core backend/schemas storage

# Empty __init__.py files
touch backend/__init__.py
touch backend/api/__init__.py
touch backend/api/routes/__init__.py
touch backend/core/__init__.py
touch backend/schemas/__init__.py

# ── backend/main.py ──
cat > backend/main.py <<'PYEOF'
import os
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Depends, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from backend.core.config import settings
from backend.core.database import init_db
from backend.api.dependencies import verify_admin_secret
from backend.api.routes import auth, keys, ai

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(keys.router, tags=["keys"])
app.include_router(ai.router, tags=["ai"])

@app.get("/")
def root():
    return {"service": settings.PROJECT_NAME, "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok", "model": settings.MODEL_NAME, "timestamp": datetime.now().isoformat()}

@app.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(...),
):
    dest = os.path.join(os.path.dirname(os.path.dirname(__file__)), path.lstrip("/"))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"uploaded": dest, "size": len(content)}

_assets = os.path.join(settings.DIST_DIR, "assets")
if os.path.isdir(_assets):
    app.mount("/assets", StaticFiles(directory=_assets), name="assets")

@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(_full_path: str):
    index = os.path.join(settings.DIST_DIR, "index.html")
    if os.path.isfile(index):
        with open(index, "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Frontend not built. Run: cd frontend && npm run build</h1>", status_code=503)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=1111, reload=True)
PYEOF

# ── backend/core/config.py ──
cat > backend/core/config.py <<'PYEOF'
import os
from pathlib import Path

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

class Settings:
    PROJECT_NAME: str = "Avaniko AI API Gateway"
    VLLM_URL: str = os.getenv("VLLM_URL", "http://localhost:8000")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "qwen3.6-35b")
    MODEL_DISPLAY_NAME: str = os.getenv("MODEL_DISPLAY_NAME", "Qwen3.6-35B-A3B")
    ADMIN_SECRET: str = os.getenv("ADMIN_SECRET", "admin_secret_change_this")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "avaniko_jwt_secret_2025_change_this")
    JWT_ALGORITHM: str = "HS256"
    DB_PATH: str = os.path.join(_BASE, "storage", "gateway_v2.db")
    DIST_DIR: str = os.path.join(_BASE, "dist")
    PRICE_PROMPT_1K: float = 0.0015
    PRICE_COMPLETION_1K: float = 0.0020
    ADMIN_EMAIL: str = "karthick.murugan@avaniko.com"
    ADMIN_PASSWORD: str = "Avan@123"
    ADMIN_NAME: str = "Karthick Murugan"

settings = Settings()
PYEOF

# ── backend/core/security.py ──
cat > backend/core/security.py <<'PYEOF'
import hashlib
import jwt
from datetime import datetime, timedelta
from backend.core.config import settings

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str):
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
PYEOF

# ── backend/core/database.py ──
cat > backend/core/database.py <<'PYEOF'
import sqlite3
import os
from datetime import datetime
from backend.core.config import settings
from backend.core.security import hash_password

def get_db():
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def _add_column_if_missing(conn, table: str, column: str, col_type: str):
    cols = [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name          TEXT NOT NULL,
            role          TEXT DEFAULT 'user',
            created_at    TEXT NOT NULL,
            is_active     INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS api_keys (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER,
            key            TEXT UNIQUE NOT NULL,
            name           TEXT NOT NULL,
            description    TEXT DEFAULT '',
            environment    TEXT DEFAULT 'production',
            created_at     TEXT NOT NULL,
            expires_at     TEXT DEFAULT NULL,
            is_active      INTEGER DEFAULT 1,
            rate_limit     INTEGER DEFAULT 500,
            token_budget   INTEGER DEFAULT 0,
            allowed_endpoints TEXT DEFAULT '',
            total_requests INTEGER DEFAULT 0,
            total_tokens   INTEGER DEFAULT 0,
            total_cost     REAL DEFAULT 0.0
        );
        CREATE TABLE IF NOT EXISTS usage_logs (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            api_key_id        INTEGER,
            endpoint          TEXT NOT NULL,
            prompt_tokens     INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            cost              REAL DEFAULT 0.0,
            timestamp         TEXT NOT NULL,
            status            TEXT DEFAULT 'success'
        );
    """)
    _add_column_if_missing(conn, "api_keys", "user_id",           "INTEGER")
    _add_column_if_missing(conn, "api_keys", "description",       "TEXT DEFAULT ''")
    _add_column_if_missing(conn, "api_keys", "environment",       "TEXT DEFAULT 'production'")
    _add_column_if_missing(conn, "api_keys", "expires_at",        "TEXT DEFAULT NULL")
    _add_column_if_missing(conn, "api_keys", "token_budget",      "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "api_keys", "allowed_endpoints", "TEXT DEFAULT ''")
    _add_column_if_missing(conn, "api_keys", "total_requests",    "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "api_keys", "total_tokens",      "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "api_keys", "total_cost",        "REAL DEFAULT 0.0")
    _add_column_if_missing(conn, "usage_logs", "api_key_id",        "INTEGER")
    _add_column_if_missing(conn, "usage_logs", "prompt_tokens",     "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "usage_logs", "completion_tokens", "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "usage_logs", "cost",              "REAL DEFAULT 0.0")
    _add_column_if_missing(conn, "usage_logs", "status",            "TEXT DEFAULT 'success'")
    conn.commit()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, name, role, created_at) VALUES (?,?,?,?,?)",
            (settings.ADMIN_EMAIL, hash_password(settings.ADMIN_PASSWORD), settings.ADMIN_NAME, "admin", datetime.now().isoformat())
        )
        conn.commit()
    except Exception:
        pass
    conn.close()
PYEOF

# ── backend/schemas/auth.py ──
cat > backend/schemas/auth.py <<'PYEOF'
from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "user"
PYEOF

# ── backend/schemas/api_key.py ──
cat > backend/schemas/api_key.py <<'PYEOF'
from pydantic import BaseModel
from typing import Optional, List

class RegisterKeyRequest(BaseModel):
    name: str
    email: str

class CreateKeyRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    environment: Optional[str] = "production"
    rate_limit: Optional[int] = 500
    token_budget: Optional[int] = 100000
    expires_in_days: Optional[int] = 0
    allowed_endpoints: Optional[List[str]] = []

class ChatRequest(BaseModel):
    messages: list
    max_tokens: Optional[int] = 2048
    temperature: Optional[float] = 0.0
    enable_thinking: Optional[bool] = False

class GenerateRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: Optional[int] = 2048
    temperature: Optional[float] = 0.7
PYEOF

# ── backend/api/dependencies.py ──
cat > backend/api/dependencies.py <<'PYEOF'
from fastapi import Header, HTTPException, Depends
from typing import Optional
from backend.core.database import get_db
from backend.core.security import decode_access_token
from backend.core.config import settings
import jwt
from datetime import datetime, timedelta

def verify_session(authorization: Optional[str] = Header(None)):
    token = (authorization or "").replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin_session(payload: dict = Depends(verify_session)):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

def require_user_session(payload: dict = Depends(verify_session)):
    return payload

def check_rate_limit(key_id: int, daily_limit: int):
    conn = get_db()
    now = datetime.now()
    minute_ago = (now - timedelta(seconds=60)).isoformat()
    rpm = conn.execute(
        "SELECT COUNT(*) FROM usage_logs WHERE api_key_id=? AND timestamp > ?",
        (key_id, minute_ago)
    ).fetchone()[0]
    today = now.strftime("%Y-%m-%d")
    rpd = conn.execute(
        "SELECT COUNT(*) FROM usage_logs WHERE api_key_id=? AND timestamp LIKE ?",
        (key_id, f"{today}%")
    ).fetchone()[0]
    conn.close()
    if rpm >= 10:
        raise HTTPException(status_code=429, detail="Rate limit exceeded: max 10 requests/minute.")
    if rpd >= daily_limit:
        raise HTTPException(status_code=429, detail=f"Daily limit exceeded: {daily_limit} requests/day.")

def verify_key(x_api_key: str = Header(...)):
    if not x_api_key or not x_api_key.startswith("ak_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    conn = get_db()
    row = conn.execute("SELECT * FROM api_keys WHERE key=? AND is_active=1", (x_api_key,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    check_rate_limit(row["id"], row["rate_limit"])
    return row

def verify_admin_secret(admin_secret: str):
    if admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

def log_usage(key_row: dict, endpoint: str, prompt_tokens: int, completion_tokens: int, status="success"):
    cost = (prompt_tokens / 1000.0) * settings.PRICE_PROMPT_1K + (completion_tokens / 1000.0) * settings.PRICE_COMPLETION_1K
    total_new_tokens = prompt_tokens + completion_tokens
    key_id = key_row["id"]
    conn = get_db()
    conn.execute(
        "INSERT INTO usage_logs (api_key_id, endpoint, prompt_tokens, completion_tokens, cost, timestamp, status) VALUES (?,?,?,?,?,?,?)",
        (key_id, endpoint, prompt_tokens, completion_tokens, cost, datetime.now().isoformat(), status)
    )
    conn.execute(
        "UPDATE api_keys SET total_requests = total_requests + 1, total_tokens = total_tokens + ?, total_cost = total_cost + ? WHERE id=?",
        (total_new_tokens, cost, key_id)
    )
    conn.commit()
    conn.close()
PYEOF

# ── backend/api/routes/auth.py ──
cat > backend/api/routes/auth.py <<'PYEOF'
from fastapi import APIRouter, HTTPException, Depends
from datetime import timedelta, datetime
import sqlite3
from backend.core.database import get_db
from backend.core.security import hash_password, create_access_token
from backend.schemas.auth import LoginRequest, CreateUserRequest
from backend.api.dependencies import verify_session, require_admin_session

router = APIRouter()

@router.post("/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email=? AND password_hash=? AND is_active=1",
        (req.email, hash_password(req.password))
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    payload = {
        "sub": user["email"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }
    token = create_access_token(payload, timedelta(days=7))
    return {"token": token, "email": user["email"], "name": user["name"], "role": user["role"]}

@router.get("/me")
def me(payload: dict = Depends(verify_session)):
    return {"email": payload["email"], "name": payload["name"], "role": payload["role"]}

@router.post("/logout")
def logout():
    return {"message": "Logged out"}

@router.post("/users")
def create_user(req: CreateUserRequest, payload: dict = Depends(require_admin_session)):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?,?,?,?,?)",
            (req.email, hash_password(req.password), req.name, req.role, datetime.now().isoformat())
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        conn.close()
    return {"message": "User created", "email": req.email, "role": req.role}

@router.get("/users")
def list_users(payload: dict = Depends(require_admin_session)):
    conn = get_db()
    rows = conn.execute("SELECT id, email, name, role, created_at, is_active FROM users").fetchall()
    conn.close()
    return {"users": [dict(r) for r in rows]}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, payload: dict = Depends(require_admin_session)):
    conn = get_db()
    me = conn.execute("SELECT id FROM users WHERE email=?", (payload["email"],)).fetchone()
    if me and me["id"] == user_id:
        conn.close()
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted"}

@router.get("/stats")
def get_stats(payload: dict = Depends(require_admin_session)):
    conn = get_db()
    total_users   = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    total_admins  = conn.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
    active_users  = conn.execute("SELECT COUNT(*) FROM users WHERE is_active=1").fetchone()[0]
    active_keys   = conn.execute("SELECT COUNT(*) FROM api_keys WHERE is_active=1").fetchone()[0]
    total_req     = conn.execute("SELECT COALESCE(SUM(total_requests),0) FROM api_keys").fetchone()[0]
    total_tokens  = conn.execute("SELECT COALESCE(SUM(total_tokens),0) FROM api_keys").fetchone()[0]
    total_cost    = conn.execute("SELECT COALESCE(SUM(total_cost),0.0) FROM api_keys").fetchone()[0]
    conn.close()
    return {
        "total_users":    total_users,
        "total_admins":   total_admins,
        "total_members":  total_users - total_admins,
        "active_users":   active_users,
        "active_keys":    active_keys,
        "total_requests": total_req,
        "total_tokens":   total_tokens,
        "total_cost":     round(total_cost, 6),
    }

@router.get("/my-stats")
def get_my_stats(payload: dict = Depends(verify_session)):
    conn = get_db()
    user_row = conn.execute("SELECT id FROM users WHERE email=?", (payload["email"],)).fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    uid = user_row["id"]
    active_keys   = conn.execute("SELECT COUNT(*) FROM api_keys WHERE user_id=? AND is_active=1", (uid,)).fetchone()[0]
    total_keys    = conn.execute("SELECT COUNT(*) FROM api_keys WHERE user_id=?", (uid,)).fetchone()[0]
    total_req     = conn.execute("SELECT COALESCE(SUM(total_requests),0) FROM api_keys WHERE user_id=?", (uid,)).fetchone()[0]
    total_tokens  = conn.execute("SELECT COALESCE(SUM(total_tokens),0) FROM api_keys WHERE user_id=?", (uid,)).fetchone()[0]
    total_cost    = conn.execute("SELECT COALESCE(SUM(total_cost),0.0) FROM api_keys WHERE user_id=?", (uid,)).fetchone()[0]
    conn.close()
    return {
        "active_keys":    active_keys,
        "total_keys":     total_keys,
        "total_requests": total_req,
        "total_tokens":   total_tokens,
        "total_cost":     round(total_cost, 6),
    }
PYEOF

# ── backend/api/routes/keys.py ──
cat > backend/api/routes/keys.py <<'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
import secrets, json
from datetime import datetime, timedelta
from typing import Optional
from backend.core.database import get_db
from backend.schemas.api_key import RegisterKeyRequest, CreateKeyRequest
from backend.api.dependencies import require_user_session, require_admin_session

router = APIRouter()

@router.post("/keys/create")
def create_key(req: CreateKeyRequest, payload: dict = Depends(require_user_session)):
    key = "ak_" + secrets.token_urlsafe(32)
    conn = get_db()
    user_row = conn.execute("SELECT id FROM users WHERE email=? AND is_active=1", (payload["email"],)).fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid active user session")

    expires_at = None
    if req.expires_in_days and req.expires_in_days > 0:
        expires_at = (datetime.now() + timedelta(days=req.expires_in_days)).isoformat()

    allowed_str = json.dumps(req.allowed_endpoints or [])

    conn.execute(
        """INSERT INTO api_keys
           (user_id, key, name, description, environment, created_at, expires_at,
            rate_limit, token_budget, allowed_endpoints)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (user_row["id"], key, req.name, req.description or "", req.environment or "production",
         datetime.now().isoformat(), expires_at, req.rate_limit, req.token_budget or 0, allowed_str)
    )
    conn.commit()
    conn.close()
    return {
        "api_key": key,
        "name": req.name,
        "environment": req.environment,
        "rate_limit": req.rate_limit,
        "token_budget": req.token_budget,
        "expires_at": expires_at,
    }

@router.get("/keys/list")
def list_keys(payload: dict = Depends(require_user_session)):
    conn = get_db()
    if payload.get("role") == "admin":
        rows = conn.execute("SELECT k.*, u.email as owner_email FROM api_keys k JOIN users u ON k.user_id = u.id").fetchall()
    else:
        user_row = conn.execute("SELECT id FROM users WHERE email=? AND is_active=1", (payload["email"],)).fetchone()
        rows = conn.execute("SELECT k.*, u.email as owner_email FROM api_keys k JOIN users u ON k.user_id = u.id WHERE k.user_id=?", (user_row["id"],)).fetchall()
    conn.close()
    return {"keys": [dict(r) for r in rows]}

@router.delete("/keys/{key_id}")
def delete_key(key_id: int, payload: dict = Depends(require_user_session)):
    conn = get_db()
    if payload.get("role") == "admin":
        conn.execute("UPDATE api_keys SET is_active=0 WHERE id=?", (key_id,))
    else:
        user_row = conn.execute("SELECT id FROM users WHERE email=? AND is_active=1", (payload["email"],)).fetchone()
        conn.execute("UPDATE api_keys SET is_active=0 WHERE id=? AND user_id=?", (key_id, user_row["id"]))
    conn.commit()
    conn.close()
    return {"message": "Key deactivated"}

@router.get("/usage")
def get_usage(api_key_id: Optional[int] = None, payload: dict = Depends(require_user_session)):
    conn = get_db()
    if payload.get("role") == "admin":
        if api_key_id:
            rows = conn.execute("SELECT l.*, k.key as actual_key FROM usage_logs l JOIN api_keys k ON l.api_key_id = k.id WHERE l.api_key_id=? ORDER BY l.timestamp DESC LIMIT 100", (api_key_id,)).fetchall()
        else:
            rows = conn.execute("SELECT l.*, k.key as actual_key FROM usage_logs l JOIN api_keys k ON l.api_key_id = k.id ORDER BY l.timestamp DESC LIMIT 100").fetchall()
        summary = conn.execute("""
            SELECT k.id as api_key_id, k.key as api_key, k.name, k.total_requests, k.total_tokens, k.total_cost, u.email as owner
            FROM api_keys k JOIN users u ON k.user_id = u.id
        """).fetchall()
    else:
        user_row = conn.execute("SELECT id FROM users WHERE email=?", (payload["email"],)).fetchone()
        user_id = user_row["id"]
        if api_key_id:
            rows = conn.execute("SELECT l.*, k.key as actual_key FROM usage_logs l JOIN api_keys k ON l.api_key_id = k.id WHERE l.api_key_id=? AND k.user_id=? ORDER BY l.timestamp DESC LIMIT 100", (api_key_id, user_id)).fetchall()
        else:
            rows = conn.execute("SELECT l.*, k.key as actual_key FROM usage_logs l JOIN api_keys k ON l.api_key_id = k.id WHERE k.user_id=? ORDER BY l.timestamp DESC LIMIT 100", (user_id,)).fetchall()
        summary = conn.execute("""
            SELECT k.id as api_key_id, k.key as api_key, k.name, k.total_requests, k.total_tokens, k.total_cost, u.email as owner
            FROM api_keys k JOIN users u ON k.user_id = u.id WHERE k.user_id=?
        """, (user_id,)).fetchall()
    conn.close()
    return {"logs": [dict(r) for r in rows], "summary": [dict(r) for r in summary]}
PYEOF

# ── backend/api/routes/ai.py ──
cat > backend/api/routes/ai.py <<'PYEOF'
from fastapi import APIRouter, Header, Form, File, UploadFile, HTTPException, Depends
import httpx
import base64
from backend.core.config import settings
from backend.schemas.api_key import ChatRequest, GenerateRequest
from backend.api.dependencies import verify_key, log_usage

router = APIRouter()

@router.post("/v1/chat/completions")
async def chat(req: ChatRequest, key_row: dict = Depends(verify_key)):
    payload = {"model": settings.MODEL_NAME, "messages": req.messages, "max_tokens": req.max_tokens, "temperature": req.temperature}
    if req.enable_thinking:
        payload["chat_template_kwargs"] = {"enable_thinking": True}
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{settings.VLLM_URL}/v1/chat/completions", json=payload)
            result = resp.json()
        usage = result.get("usage", {})
        log_usage(key_row, "/v1/chat/completions", usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
        return result
    except Exception as e:
        log_usage(key_row, "/v1/chat/completions", 0, 0, "error")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/v1/generate")
async def generate(req: GenerateRequest, key_row: dict = Depends(verify_key)):
    messages = []
    if req.system:
        messages.append({"role": "system", "content": req.system})
    messages.append({"role": "user", "content": req.prompt})
    payload = {
        "model": settings.MODEL_NAME,
        "messages": messages,
        "max_tokens": req.max_tokens,
        "temperature": req.temperature,
    }
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{settings.VLLM_URL}/v1/chat/completions", json=payload)
            raw = resp.json()
        usage = raw.get("usage", {})
        choice = raw["choices"][0]
        log_usage(key_row, "/v1/generate", usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
        return {
            "id": raw.get("id", ""),
            "model": settings.MODEL_DISPLAY_NAME,
            "text": choice["message"]["content"],
            "finish_reason": choice.get("finish_reason", "stop"),
            "usage": {
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            }
        }
    except Exception as e:
        log_usage(key_row, "/v1/generate", 0, 0, "error")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/v1/vision/analyze")
async def vision_analyze(
    file: UploadFile = File(...),
    prompt: str = Form(default="Extract all invoice data as JSON. Return only valid JSON."),
    enable_thinking: bool = Form(default=False),
    key_row: dict = Depends(verify_key)
):
    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode()
    mime = file.content_type or "image/jpeg"
    messages = [{"role": "user", "content": [
        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
        {"type": "text", "text": prompt}
    ]}]
    payload = {"model": settings.MODEL_NAME, "messages": messages, "max_tokens": 4096, "temperature": 0}
    if enable_thinking:
        payload["chat_template_kwargs"] = {"enable_thinking": True}
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(f"{settings.VLLM_URL}/v1/chat/completions", json=payload)
            result = resp.json()
        usage = result.get("usage", {})
        log_usage(key_row, "/v1/vision/analyze", usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))
        content = result["choices"][0]["message"]["content"]
        return {"result": content, "usage": usage}
    except Exception as e:
        log_usage(key_row, "/v1/vision/analyze", 0, 0, "error")
        raise HTTPException(status_code=500, detail=str(e))
PYEOF

# ── .env file ──
if [ ! -f .env ]; then
cat > .env <<'EOF'
VLLM_URL=http://localhost:8000
MODEL_NAME=qwen3.6-35b
MODEL_DISPLAY_NAME=Qwen3.6-35B-A3B
ADMIN_SECRET=avaniko_admin_change_me
JWT_SECRET=avaniko_jwt_change_me
EOF
echo "✅ .env created"
else
echo "ℹ️  .env already exists, skipping"
fi

# Install deps
echo ""
echo "📦 Installing Python dependencies..."
pip install --quiet fastapi uvicorn httpx pyjwt python-multipart bcrypt

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Backend setup complete at: $PROJECT_DIR"
echo ""
echo "📋 Files created:"
find backend -type f | sort
echo ""
echo "🚀 Run backend:"
echo "   cd $PROJECT_DIR && python -m backend.main"
echo "════════════════════════════════════════════════════════════════"
