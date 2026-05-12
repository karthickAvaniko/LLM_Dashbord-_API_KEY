"""
Dynamic mode lookup — schemas live in the DB now.
This file just provides a thin in-memory cache so we don't hit SQLite on every request.
"""
import json
import time
from typing import Optional, Dict, Any, List
from backend.core.database import get_db

_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TS = 0.0
_CACHE_TTL = 30  # seconds — short so admin edits propagate fast


def _row_to_dict(row) -> Dict[str, Any]:
    d = dict(row)
    try:
        d["json_schema"] = json.loads(d["json_schema"])
    except Exception:
        d["json_schema"] = {}
    return d


def _refresh_cache():
    global _CACHE, _CACHE_TS
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM extraction_modes WHERE is_active=1"
    ).fetchall()
    conn.close()
    _CACHE = {row["name"]: _row_to_dict(row) for row in rows}
    _CACHE_TS = time.time()


def get_mode(name: str) -> Optional[Dict[str, Any]]:
    """Look up a mode by name (e.g. 'invoice'). None if not found / inactive."""
    if not name:
        return None
    if (time.time() - _CACHE_TS) > _CACHE_TTL or name not in _CACHE:
        _refresh_cache()
    return _CACHE.get(name)


def list_modes(include_inactive: bool = False) -> List[Dict[str, Any]]:
    """List all modes (used by admin and /v1/modes endpoint)."""
    conn = get_db()
    sql = "SELECT * FROM extraction_modes"
    if not include_inactive:
        sql += " WHERE is_active=1"
    sql += " ORDER BY id ASC"
    rows = conn.execute(sql).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def invalidate_cache():
    """Force next get_mode() to re-read from DB. Call after admin edits."""
    global _CACHE_TS
    _CACHE_TS = 0.0
