from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import secrets, json, csv, io
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from backend.core.database import get_db
from backend.core.security import hash_password
from backend.schemas.api_key import RegisterKeyRequest, CreateKeyRequest
from backend.api.dependencies import require_user_session, require_admin_session

class UpdateLimitsRequest(BaseModel):
    rate_limit: Optional[int] = None        # requests / day
    token_budget: Optional[int] = None      # tokens / day (0 = unlimited)
    expires_in_days: Optional[int] = None   # 0 = clear expiry

router = APIRouter()

# ── Public registration (no auth) — Gemini-style key request ──
@router.post("/v1/keys/register")
def register_key(req: RegisterKeyRequest):
    """Public endpoint — no JWT needed.
    Creates a user (if email new) and returns a fresh API key.
    """
    conn = get_db()
    # Find or auto-create user
    user_row = conn.execute("SELECT * FROM users WHERE email=?", (req.email,)).fetchone()
    if not user_row:
        # Auto-register with random password (user can reset later)
        random_pw = secrets.token_urlsafe(16)
        conn.execute(
            "INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?,?,?,?,?)",
            (req.email, hash_password(random_pw), req.name or req.email.split("@")[0], "user", datetime.now().isoformat())
        )
        conn.commit()
        user_row = conn.execute("SELECT * FROM users WHERE email=?", (req.email,)).fetchone()

    # Generate key
    key = "ak_" + secrets.token_urlsafe(32)
    conn.execute(
        """INSERT INTO api_keys
           (user_id, key, name, description, environment, created_at,
            rate_limit, token_budget, allowed_endpoints)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (user_row["id"], key, req.name or "default", "auto-generated via public registration",
         "production", datetime.now().isoformat(), 200, 100000, "[]")
    )
    conn.commit()
    conn.close()
    return {
        "api_key": key,
        "key": key,
        "name": req.name,
        "email": req.email,
        "rate_limit": 200,
        "token_budget": 100000,
        "created_at": datetime.now().isoformat(),
    }

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

@router.put("/keys/{key_id}/limits")
def update_key_limits(key_id: int, req: UpdateLimitsRequest, payload: dict = Depends(require_user_session)):
    """Update rate_limit, token_budget, or expiry for a key the caller owns (admin can update any key)."""
    conn = get_db()
    if payload.get("role") == "admin":
        row = conn.execute("SELECT id FROM api_keys WHERE id=? AND is_active=1", (key_id,)).fetchone()
    else:
        user_row = conn.execute("SELECT id FROM users WHERE email=? AND is_active=1", (payload["email"],)).fetchone()
        row = conn.execute("SELECT id FROM api_keys WHERE id=? AND user_id=? AND is_active=1", (key_id, user_row["id"])).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Key not found or access denied")

    updates, params = [], []
    if req.rate_limit is not None:
        updates.append("rate_limit=?"); params.append(req.rate_limit)
    if req.token_budget is not None:
        updates.append("token_budget=?"); params.append(req.token_budget)
    if req.expires_in_days is not None:
        if req.expires_in_days == 0:
            updates.append("expires_at=NULL")
        else:
            updates.append("expires_at=?")
            params.append((datetime.now() + timedelta(days=req.expires_in_days)).isoformat())

    if updates:
        params.append(key_id)
        conn.execute(f"UPDATE api_keys SET {', '.join(updates)} WHERE id=?", params)
        conn.commit()
    conn.close()
    return {"message": "Limits updated", "key_id": key_id}


@router.get("/usage/export")
def export_usage_csv(payload: dict = Depends(require_user_session)):
    """Export usage logs as CSV download."""
    conn = get_db()
    if payload.get("role") == "admin":
        rows = conn.execute(
            "SELECT l.id, k.name as key_name, k.key, l.endpoint, l.prompt_tokens, "
            "l.completion_tokens, l.cost, l.timestamp, l.status "
            "FROM usage_logs l JOIN api_keys k ON l.api_key_id = k.id "
            "ORDER BY l.timestamp DESC LIMIT 5000"
        ).fetchall()
    else:
        user_row = conn.execute("SELECT id FROM users WHERE email=?", (payload["email"],)).fetchone()
        rows = conn.execute(
            "SELECT l.id, k.name as key_name, k.key, l.endpoint, l.prompt_tokens, "
            "l.completion_tokens, l.cost, l.timestamp, l.status "
            "FROM usage_logs l JOIN api_keys k ON l.api_key_id = k.id "
            "WHERE k.user_id=? ORDER BY l.timestamp DESC LIMIT 5000",
            (user_row["id"],)
        ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Key Name", "Key", "Endpoint", "Prompt Tokens", "Completion Tokens", "Cost (USD)", "Timestamp", "Status"])
    for r in rows:
        writer.writerow([r["id"], r["key_name"], r["key"][:16] + "...", r["endpoint"],
                         r["prompt_tokens"], r["completion_tokens"], f'{r["cost"]:.6f}',
                         r["timestamp"], r["status"]])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=usage_export.csv"}
    )


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
