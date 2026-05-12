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

# ── Admin-wide stats (admin only) ──────────────────────────────────────────
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

# ── Per-user stats (any logged-in user) ────────────────────────────────────
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
