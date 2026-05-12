import os
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Depends, Form, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response

from backend.core.config import settings
from backend.core.database import init_db
from backend.api.dependencies import verify_admin_secret
from backend.api.routes import auth, keys, ai, admin_modes

app = FastAPI(title=settings.PROJECT_NAME)

# Explicit, permissive CORS — works behind RunPod proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Catch-all OPTIONS handler — guarantees preflight succeeds even when
# RunPod proxy strips/rewrites headers in unexpected ways.
@app.options("/{full_path:path}", include_in_schema=False)
async def preflight(_full_path: str, request: Request):
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
            "Vary": "Origin",
        },
    )

# Initialize database
init_db()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(keys.router, tags=["keys"])
app.include_router(ai.router, tags=["ai"])
app.include_router(admin_modes.router, tags=["admin"])

@app.get("/")
def root():
    return {"service": settings.PROJECT_NAME, "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok", "model": settings.MODEL_NAME, "timestamp": datetime.now().isoformat()}

# Admin file upload
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

# Serve SPA
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
