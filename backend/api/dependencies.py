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
    # Any valid logged in user (user or admin) can execute
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
