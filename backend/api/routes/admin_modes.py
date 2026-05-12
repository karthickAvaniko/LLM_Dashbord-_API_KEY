"""
Admin CRUD for extraction modes — only admin users can mutate.
"""
import json
from datetime import datetime
from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from backend.core.database import get_db
from backend.core.schemas import invalidate_cache, list_modes
from backend.api.dependencies import require_admin_session, require_user_session

router = APIRouter()


# ──────────────────────────────────────────────────────────────────
#  Schemas (request bodies)
# ──────────────────────────────────────────────────────────────────
class ModeCreate(BaseModel):
    name: str = Field(..., description="Unique slug, e.g. 'invoice'")
    label: str
    description: Optional[str] = ""
    icon: Optional[str] = ""
    json_schema: Dict[str, Any]
    system_prompt: str
    default_prompt: Optional[str] = ""
    temperature: float = 0.0
    max_tokens: int = 8192
    is_active: bool = True


class ModeUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    json_schema: Optional[Dict[str, Any]] = None
    system_prompt: Optional[str] = None
    default_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    is_active: Optional[bool] = None


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────
@router.get("/admin/modes")
def admin_list_modes(_: dict = Depends(require_user_session)):
    """List ALL modes (active + inactive). Logged-in users only."""
    return {"modes": list_modes(include_inactive=True)}


@router.get("/admin/modes/{name}")
def admin_get_mode(name: str, _: dict = Depends(require_user_session)):
    conn = get_db()
    row = conn.execute("SELECT * FROM extraction_modes WHERE name=?", (name,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, f"Mode '{name}' not found")
    d = dict(row)
    try: d["json_schema"] = json.loads(d["json_schema"])
    except Exception: d["json_schema"] = {}
    return d


@router.post("/admin/modes")
def admin_create_mode(body: ModeCreate, payload: dict = Depends(require_admin_session)):
    """Admin-only — create a new extraction mode."""
    conn = get_db()
    user_row = conn.execute("SELECT id FROM users WHERE email=?", (payload["email"],)).fetchone()
    user_id = user_row["id"] if user_row else None
    now = datetime.now().isoformat()

    # Validate name uniqueness
    exists = conn.execute("SELECT 1 FROM extraction_modes WHERE name=?", (body.name,)).fetchone()
    if exists:
        conn.close()
        raise HTTPException(400, f"Mode '{body.name}' already exists")

    try:
        conn.execute(
            """INSERT INTO extraction_modes
               (name, label, description, icon, json_schema, system_prompt,
                default_prompt, temperature, max_tokens, is_active, created_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (body.name, body.label, body.description or "", body.icon or "",
             json.dumps(body.json_schema), body.system_prompt,
             body.default_prompt or "", float(body.temperature), int(body.max_tokens),
             1 if body.is_active else 0, user_id, now)
        )
        conn.commit()
    finally:
        conn.close()
    invalidate_cache()
    return {"message": "Mode created", "name": body.name}


@router.put("/admin/modes/{name}")
def admin_update_mode(name: str, body: ModeUpdate, _: dict = Depends(require_admin_session)):
    """Admin-only — update fields on an existing mode."""
    conn = get_db()
    row = conn.execute("SELECT * FROM extraction_modes WHERE name=?", (name,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, f"Mode '{name}' not found")

    updates = body.dict(exclude_unset=True)
    if not updates:
        conn.close()
        raise HTTPException(400, "No fields to update")

    set_parts = []
    values = []
    for key, val in updates.items():
        if key == "json_schema":
            val = json.dumps(val)
        elif key == "is_active":
            val = 1 if val else 0
        set_parts.append(f"{key}=?")
        values.append(val)
    set_parts.append("updated_at=?")
    values.append(datetime.now().isoformat())
    values.append(name)

    conn.execute(f"UPDATE extraction_modes SET {', '.join(set_parts)} WHERE name=?", values)
    conn.commit()
    conn.close()
    invalidate_cache()
    return {"message": "Mode updated", "name": name, "updated_fields": list(updates.keys())}


@router.delete("/admin/modes/{name}")
def admin_delete_mode(name: str, hard: bool = False, _: dict = Depends(require_admin_session)):
    """Admin-only — soft delete (set is_active=0). Pass ?hard=true to permanently remove."""
    conn = get_db()
    row = conn.execute("SELECT id FROM extraction_modes WHERE name=?", (name,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, f"Mode '{name}' not found")
    if hard:
        conn.execute("DELETE FROM extraction_modes WHERE name=?", (name,))
    else:
        conn.execute("UPDATE extraction_modes SET is_active=0, updated_at=? WHERE name=?",
                     (datetime.now().isoformat(), name))
    conn.commit()
    conn.close()
    invalidate_cache()
    return {"message": "Mode deactivated" if not hard else "Mode deleted", "name": name}
