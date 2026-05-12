# 🔌 RunPod-ஐ உங்க Dashboard-கு Connect பண்றது (தமிழ்)

இந்த guide உங்க **local llmDashboard** (port 1111)-ஐ **RunPod-ல run ஆகற Qwen3.6 vLLM** (port 8000)-கு connect பண்றதுக்கு.

---

## 🎯 Architecture (இது நடக்கபோறது)

```
[Browser]
   ↓  http://localhost:5173 (Vite dev server)
[React Frontend]
   ↓  POST /v1/generate  (X-API-Key header)
[FastAPI Backend — local PC, port 1111]
   ↓  POST /v1/chat/completions  (OpenAI format)
[RunPod vLLM Server — A40 GPU, port 8000]
   ↓
[Qwen3.6-35B-A3B-FP8]  → Response
```

Backend already perfect-a wired up இருக்கு. நாம ஒரே ஒரு setting தான் fix பண்ணணும்: **vLLM URL**.

---

## 📋 Step 1: RunPod Public URL எடுக்கணும்

RunPod automatically port 8000-க்கு public proxy URL provide பண்றது (DNS / domain எல்லாம் தேவையில்ல).

1. **RunPod Console** → https://runpod.io/console/pods
2. உங்க pod (`qwen-api-prod`) click பண்ணுங்க
3. மேலே **"Connect"** button click பண்ணுங்க
4. Pop-up-ல **"HTTP Service [Port 8000]"** section search பண்ணுங்க
5. அங்க URL இருக்கும் — பாருங்க இப்படி:
   ```
   https://6picn4vdodn0ao-8000.proxy.runpod.net
   ```
6. அந்த URL-ஐ **copy** பண்ணுங்க

> **Note:** "HTTP Service [Port 8000]" காணல-ன்னா Pod settings-ல port 8000 expose ஆகல. Pod edit பண்ணி **8000/http** add பண்ணுங்க.

---

## 📋 Step 2: Public URL-ஐ Test பண்ணுங்க

Browser-ல open பண்ணி check பண்ணுங்க:

```
https://YOUR_POD_ID-8000.proxy.runpod.net/v1/models
```

இப்படி response வந்தா → connection working ✅
```json
{
  "object": "list",
  "data": [{"id": "qwen3.6-35b", ...}]
}
```

Empty / error வந்தா → vLLM server start ஆகல. Pod-ல SSH பண்ணி check:
```bash
systemctl status vllm
# அல்லது
ps aux | grep vllm
```

---

## 📋 Step 3: `.env` File Create பண்ணுங்க

Project root-ல (`D:\llmDashboard\llmDashboard\`) **`.env`** file create பண்ணுங்க:

```bash
# .env  (இந்த file git-ignored — secrets safe)

VLLM_URL=https://YOUR_POD_ID-8000.proxy.runpod.net
MODEL_NAME=qwen3.6-35b
MODEL_DISPLAY_NAME=Qwen3.6-35B-A3B

ADMIN_SECRET=avaniko_admin_2026_xxxxx
JWT_SECRET=avaniko_jwt_2026_xxxxx
```

`YOUR_POD_ID` இடத்துல Step 1-ல copy பண்ண actual URL paste பண்ணுங்க.

> **Tip:** `.env.example` file ready-ஆ இருக்கு. அதை copy பண்ணி `.env`-ஆ rename பண்ணி edit பண்ணுங்க:
> ```bash
> copy .env.example .env
> ```

---

## 📋 Step 4: Backend Start பண்ணுங்க

```bash
cd D:\llmDashboard\llmDashboard

# Python deps install (first time only)
pip install fastapi uvicorn httpx pyjwt python-multipart bcrypt

# Backend run
python -m backend.main
```

Output:
```
INFO:     Uvicorn running on http://0.0.0.0:1111
```

Test:
```bash
curl http://localhost:1111/health
# → {"status":"ok","model":"qwen3.6-35b","timestamp":"..."}
```

---

## 📋 Step 5: Frontend Start பண்ணுங்க

```bash
cd D:\llmDashboard\llmDashboard\frontend
npm install   # first time only
npm run dev
```

Browser open: **http://localhost:5173**

---

## 📋 Step 6: End-to-End Test

1. Login → Get API Key page-ல API key generate பண்ணுங்க
2. Playground-கு போங்க
3. API key paste பண்ணுங்க
4. Prompt: `வணக்கம், நீ யார்?`
5. **Generate** click

Response வந்தா → 🎉 **Full stack working!** Frontend → Local Backend → RunPod GPU → Qwen3.6 → Response.

---

## 🔧 Troubleshooting

### ❌ "Connection refused"
- Backend running-ஆ? `curl http://localhost:1111/health`
- Frontend `.env`-ல `VITE_API_URL=http://localhost:1111` set ஆகியிருக்கானு check

### ❌ "502 Bad Gateway" or timeout from RunPod
- Pod sleep mode-ல போகுச்சா? RunPod console-ல check
- vLLM service alive-ஆ? Pod SSH → `systemctl status vllm`

### ❌ "Invalid API key format"
- API key `ak_` prefix-ல start ஆகுதா? Get-Key page-ல generate பண்ணினதை use பண்ணுங்க

### ❌ Slow first response (10-30 seconds)
- RunPod proxy cold start. Subsequent requests fast ஆ வரும்.

---

## 💰 Cost Reminder

| Component | Cost |
|-----------|-----:|
| RunPod A40 (running) | $0.44/hr × 24 = **$10.56/day** |
| RunPod A40 (stopped, only volume) | $0.23/day |
| Local backend + frontend | $0 |

**Demo / dev test ஆனப்புறம் pod stop பண்ணுங்க!** Otherwise daily $10+ charge ஆகும்.

---

## 🚀 Production Deployment (Later)

இப்போ local-ல run பண்ணுவோம். Production-கு போற போது:

1. **Backend deploy** → Railway / Hetzner / RunPod CPU pod
2. **Frontend build** → `npm run build` → static host (Cloudflare Pages free)
3. **Custom domain** → Cloudflare DNS → API endpoint
4. **HTTPS** → Cloudflare automatic SSL

---

## ✅ Files Modified for This Connection

- ✏️ `backend/core/config.py` — env var-ஆ VLLM_URL, MODEL_NAME read பண்றது
- ✏️ `backend/api/routes/ai.py` — display name use பண்றது
- ✏️ `frontend/src/components/Navbar.jsx` — model name updated
- ✏️ `frontend/src/components/Sidebar.jsx` — model name updated
- ✏️ `frontend/src/pages/Playground.jsx` — model name updated
- ✏️ `frontend/src/pages/GetKey.jsx` — model name updated
- ✏️ `frontend/src/pages/Docs.jsx` — model name updated
- 🆕 `.env.example` — template
- 🆕 `.gitignore` — secrets safe
- 🆕 `CONNECT_RUNPOD_TAMIL.md` — இந்த guide

---

**Next:** RunPod console-ல port 8000 public URL எடுத்து, `.env` file fill பண்ணி, backend + frontend run பண்ணுங்க. அப்போ Playground-ல Tamil prompt அனுப்பி test பண்ணுங்க! 🎯
