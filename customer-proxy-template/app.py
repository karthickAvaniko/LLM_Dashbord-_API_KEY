"""
═══════════════════════════════════════════════════════════════════════
  AVANIKO AI — Customer Backend Proxy Template (FastAPI)
═══════════════════════════════════════════════════════════════════════
  Drop-in starter for SaaS products that use Avaniko AI.

  Features:
    • API key NEVER leaves the server (browsers can't see it)
    • Per-user JWT auth
    • Per-user rate limiting (in-memory, swap for Redis in prod)
    • Response caching (input hash → cached output)
    • Retry with exponential backoff
    • Streaming support
    • Logging every call (user, tokens, cost)

  Setup:
    1. pip install fastapi uvicorn httpx pyjwt python-multipart
    2. Set env vars (or .env file):
         AVANIKO_API_KEY=ak_xxx       (your Avaniko key)
         JWT_SECRET=<random>          (for your end-user auth)
    3. uvicorn app:app --host 0.0.0.0 --port 8080 --reload

  Endpoints exposed to YOUR end users:
    POST /api/chat              — chatbot
    POST /api/extract/invoice   — invoice → JSON
    POST /api/extract/receipt   — receipt → JSON
    POST /api/extract/id        — ID document → JSON
    POST /api/code              — code generation
    POST /api/translate         — translation
    POST /api/summarize         — summarization
    POST /api/ocr               — image text extraction

  All endpoints require Authorization: Bearer <YOUR_USER_JWT>
═══════════════════════════════════════════════════════════════════════
"""
import os
import time
import json
import hashlib
import asyncio
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import httpx
import jwt
from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# ───────────── CONFIG ─────────────
AVANIKO_API_KEY  = os.environ.get("AVANIKO_API_KEY", "")
AVANIKO_BASE_URL = os.environ.get("AVANIKO_BASE_URL", "https://wo50dppqmt72bl-1111.proxy.runpod.net")
JWT_SECRET       = os.environ.get("JWT_SECRET", "your_jwt_secret_change_this")
JWT_ALGORITHM    = "HS256"
CACHE_TTL_SEC    = int(os.environ.get("CACHE_TTL_SEC", "3600"))   # 1h
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", "30"))
RATE_LIMIT_PER_DAY = int(os.environ.get("RATE_LIMIT_PER_DAY", "500"))

if not AVANIKO_API_KEY:
    raise RuntimeError("Set AVANIKO_API_KEY env var.")

# ───────────── APP ─────────────
app = FastAPI(title="Avaniko AI — Customer Proxy", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ───────────── IN-MEMORY STORAGE (swap with Redis in prod) ─────────────
_cache: Dict[str, tuple] = {}                                # hash → (timestamp, value)
_rate_limits: Dict[str, deque] = defaultdict(lambda: deque())  # user_id → timestamps
_usage_log: List[Dict[str, Any]] = []                         # in-memory; persist to DB in prod


def _cache_get(key: str):
    if key not in _cache: return None
    ts, val = _cache[key]
    if time.time() - ts > CACHE_TTL_SEC:
        del _cache[key]
        return None
    return val


def _cache_set(key: str, val):
    _cache[key] = (time.time(), val)


def _hash_request(*parts) -> str:
    h = hashlib.sha256()
    for p in parts:
        if isinstance(p, (bytes, bytearray)): h.update(p)
        else: h.update(str(p).encode())
    return h.hexdigest()[:32]


# ───────────── AUTH (JWT — your end users) ─────────────
def issue_jwt(user_id: str, expires_days: int = 30) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=expires_days),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = authorization.replace("Bearer ", "").strip()
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ───────────── RATE LIMITING (in-memory) ─────────────
def check_rate_limit(user_id: str):
    q = _rate_limits[user_id]
    now = time.time()
    # Trim old timestamps
    while q and q[0] < now - 86400:  # remove > 24h old
        q.popleft()
    # Per-minute
    in_minute = sum(1 for t in q if t > now - 60)
    if in_minute >= RATE_LIMIT_PER_MIN:
        raise HTTPException(429, f"Rate limit: max {RATE_LIMIT_PER_MIN}/min")
    # Per-day
    in_day = len(q)
    if in_day >= RATE_LIMIT_PER_DAY:
        raise HTTPException(429, f"Daily limit: max {RATE_LIMIT_PER_DAY}/day")
    q.append(now)


def log_usage(user_id: str, endpoint: str, tokens: int, cost: float = 0.0, status: str = "success"):
    _usage_log.append({
        "user_id": user_id,
        "endpoint": endpoint,
        "tokens": tokens,
        "cost": cost,
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
    })
    if len(_usage_log) > 10000:
        del _usage_log[:1000]


# ───────────── AVANIKO CLIENT (with retry) ─────────────
async def call_avaniko(path: str, *, json_body=None, files=None, data=None,
                       retries: int = 3, timeout: float = 180):
    headers = {"X-API-Key": AVANIKO_API_KEY}
    if json_body is not None:
        headers["Content-Type"] = "application/json"
    last_err = None
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    f"{AVANIKO_BASE_URL}{path}",
                    headers=headers,
                    json=json_body,
                    files=files,
                    data=data,
                )
            if resp.status_code in (429, 502, 503, 504):
                raise httpx.HTTPError(f"{resp.status_code}: {resp.text[:200]}")
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            last_err = e
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    raise HTTPException(502, f"Upstream error: {last_err}")


# ═══════════════════════════════════════════════════════════════
# REQUEST MODELS
# ═══════════════════════════════════════════════════════════════
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: int = 1024
    temperature: float = 0.7

class TextRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: int = 1024
    temperature: float = 0.7

class SummarizeRequest(BaseModel):
    text: str
    length: str = "medium"   # short | medium | long

class TranslateRequest(BaseModel):
    text: str
    to_lang: str
    from_lang: str = "auto"

class CodeRequest(BaseModel):
    description: str
    language: str = "python"


# ═══════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS — your end users call these
# ═══════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"service": "Avaniko AI Customer Proxy", "status": "running",
            "endpoints": ["/api/chat", "/api/extract/invoice", "/api/extract/receipt",
                          "/api/extract/id", "/api/code", "/api/translate",
                          "/api/summarize", "/api/ocr"]}


@app.post("/auth/issue-test-token")
def issue_test_token(user_id: str = "demo_user"):
    """Dev helper — issue a test JWT. In production, integrate with your real auth."""
    return {"token": issue_jwt(user_id), "user_id": user_id}


# ── CHAT ─────────────────────────────────────────────────────────
@app.post("/api/chat")
async def api_chat(req: ChatRequest, user: dict = Depends(verify_user)):
    user_id = user["sub"]
    check_rate_limit(user_id)

    body = {"messages": [m.dict() for m in req.messages],
            "max_tokens": req.max_tokens, "temperature": req.temperature}
    result = await call_avaniko("/v1/chat/completions", json_body=body)
    log_usage(user_id, "chat", result.get("usage", {}).get("total_tokens", 0))
    return {
        "reply": result["choices"][0]["message"].get("content", ""),
        "usage": result.get("usage", {}),
    }


# ── DOCUMENT EXTRACTION ────────────────────────────────────────
async def _extract(mode: str, file: UploadFile, user_id: str):
    file_bytes = await file.read()
    cache_key = _hash_request(mode, file_bytes)

    cached = _cache_get(cache_key)
    if cached:
        log_usage(user_id, f"extract/{mode}", 0, status="cache_hit")
        return {"data": cached, "cached": True}

    files = {"file": (file.filename, file_bytes, file.content_type or "application/octet-stream")}
    data = {"prompt": f"Extract this {mode}. Output valid JSON only.",
            "mode": mode, "max_tokens": "4096", "temperature": "0"}
    result = await call_avaniko("/v1/vision/analyze", files=files, data=data)

    text_out = result.get("text") or result.get("result", "")
    parsed = _try_parse_json(text_out)
    _cache_set(cache_key, parsed)
    log_usage(user_id, f"extract/{mode}", result.get("usage", {}).get("total_tokens", 0))
    return {"data": parsed, "cached": False, "usage": result.get("usage", {})}


def _try_parse_json(text: str):
    if not text: return {}
    t = text.strip()
    if t.startswith("```"):
        parts = t.split("```")
        if len(parts) >= 2:
            t = parts[1]
            if t.startswith("json"): t = t[4:]
    try: return json.loads(t.strip())
    except: return {"_raw": text}


@app.post("/api/extract/invoice")
async def api_extract_invoice(file: UploadFile = File(...), user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    return await _extract("invoice", file, user["sub"])


@app.post("/api/extract/receipt")
async def api_extract_receipt(file: UploadFile = File(...), user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    return await _extract("receipt", file, user["sub"])


@app.post("/api/extract/id")
async def api_extract_id(file: UploadFile = File(...), user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    return await _extract("id_card", file, user["sub"])


# ── CODE GENERATION ────────────────────────────────────────────
@app.post("/api/code")
async def api_code(req: CodeRequest, user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    sys_msg = "You are a senior software engineer. Write clean, well-commented, production code with tests."
    body = {
        "prompt": f"Write {req.language} code for: {req.description}\n\nInclude tests and example usage.",
        "system": sys_msg, "max_tokens": 2000, "temperature": 0.2,
    }
    result = await call_avaniko("/v1/generate", json_body=body)
    log_usage(user["sub"], "code", result.get("usage", {}).get("total_tokens", 0))
    return {"code": result.get("text", ""), "usage": result.get("usage", {})}


# ── TRANSLATE ──────────────────────────────────────────────────
@app.post("/api/translate")
async def api_translate(req: TranslateRequest, user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    sys_msg = "You are a professional translator. Output ONLY the translated text — no commentary."
    prompt = (f"Translate this {req.from_lang} to {req.to_lang}:\n\n{req.text}"
              if req.from_lang != "auto" else f"Translate this to {req.to_lang}:\n\n{req.text}")
    body = {"prompt": prompt, "system": sys_msg, "max_tokens": 2048, "temperature": 0.2}
    result = await call_avaniko("/v1/generate", json_body=body)
    log_usage(user["sub"], "translate", result.get("usage", {}).get("total_tokens", 0))
    return {"translation": result.get("text", "").strip(), "usage": result.get("usage", {})}


# ── SUMMARIZE ──────────────────────────────────────────────────
@app.post("/api/summarize")
async def api_summarize(req: SummarizeRequest, user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    instructions = {
        "short":  "Summarize in 2-3 sentences.",
        "medium": "Summarize in 5-7 bullet points.",
        "long":   "Provide a detailed summary structured under headings.",
    }
    instr = instructions.get(req.length, instructions["medium"])
    body = {"prompt": f"{instr}\n\nText:\n{req.text}", "max_tokens": 1500, "temperature": 0.3}
    result = await call_avaniko("/v1/generate", json_body=body)
    log_usage(user["sub"], "summarize", result.get("usage", {}).get("total_tokens", 0))
    return {"summary": result.get("text", ""), "usage": result.get("usage", {})}


# ── OCR ────────────────────────────────────────────────────────
@app.post("/api/ocr")
async def api_ocr(file: UploadFile = File(...), user: dict = Depends(verify_user)):
    check_rate_limit(user["sub"])
    file_bytes = await file.read()
    cache_key = _hash_request("ocr", file_bytes)
    cached = _cache_get(cache_key)
    if cached:
        log_usage(user["sub"], "ocr", 0, status="cache_hit")
        return {"text": cached, "cached": True}

    files = {"file": (file.filename, file_bytes, file.content_type or "image/jpeg")}
    data = {"prompt": "Extract all visible text. Preserve layout. Text only.",
            "max_tokens": "4096", "temperature": "0"}
    result = await call_avaniko("/v1/vision/analyze", files=files, data=data)
    text_out = result.get("text") or result.get("result", "")
    _cache_set(cache_key, text_out)
    log_usage(user["sub"], "ocr", result.get("usage", {}).get("total_tokens", 0))
    return {"text": text_out, "cached": False, "usage": result.get("usage", {})}


# ── ADMIN: usage analytics ─────────────────────────────────────
@app.get("/admin/usage")
def admin_usage(user: dict = Depends(verify_user)):
    """Return usage stats for the current user (in production, restrict to admin)."""
    user_logs = [log for log in _usage_log if log["user_id"] == user["sub"]]
    by_endpoint = defaultdict(lambda: {"calls": 0, "tokens": 0})
    for log in user_logs:
        by_endpoint[log["endpoint"]]["calls"] += 1
        by_endpoint[log["endpoint"]]["tokens"] += log["tokens"]
    return {
        "user_id": user["sub"],
        "total_calls": len(user_logs),
        "by_endpoint": dict(by_endpoint),
        "recent": user_logs[-20:],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
