# Qwen3.6-35B-A3B RunPod Deployment Guide (தமிழ்)

## 🎯 Overview — நீங்க என்ன build பண்ண போறீங்க

**Goal:** Gemini API மாதிரி own LLM API service — 3 skills (Invoice→JSON, Coding, Reasoning) — single API key system.

**Stack:**
- Model: `Qwen/Qwen3.6-35B-A3B-FP8` (35B MoE, 3B active)
- GPU: RunPod A40 48GB VRAM, 50GB RAM
- Engine: vLLM
- Gateway: FastAPI
- Auth: Custom API keys (`yourname-xxxxxxxxxx` format)
- Database: PostgreSQL (Supabase free tier)

---

## 📋 Phase 1: RunPod Pod Creation

### Step 1.1: Network Volume Create பண்ணுங்க

Network volume = persistent storage. Pod restart ஆனாலும் model weights save ஆகும்.

1. RunPod Console → **Storage** → **Network Volumes**
2. **+ New Volume** click
3. Settings:
   - **Name:** `qwen-models-vol`
   - **Size:** `100 GB` (35GB model + cache + room for future)
   - **Datacenter:** EU-RO-1 அல்லது US-CA (GPU available areas)
4. **Create Volume** click

**Cost:** $7/month (100GB × $0.07)

---

### Step 1.2: Pod Create பண்ணுங்க

1. RunPod Console → **Pods** → **+ Deploy**
2. **GPU select:** A40 48GB
3. **Template select:** `RunPod PyTorch 2.4` (or vLLM official template if available)
4. **Pod settings:**
   - **Name:** `qwen-api-prod`
   - **Network Volume:** Select your `qwen-models-vol`
   - **Volume mount path:** `/workspace`
   - **Container Disk:** 50 GB (OS + temp files)
   - **Expose ports:** `8000/http` (for vLLM), `22/tcp` (for SSH)
5. **Environment Variables:**
   ```
   HF_TOKEN=hf_your_token_here
   HF_HOME=/workspace/huggingface
   ```
6. **Deploy On-Demand** click

**Cost:** $0.44/hr = $317/month (24/7) | **Stop pod when not in use!**

---

## 📋 Phase 2: Model Setup (Inside Pod)

### Step 2.1: Connect to Pod

3 ways to connect:
- **Web Terminal** (easiest) — Pod page → "Connect" → "Start Web Terminal"
- **SSH** — `ssh root@<pod-ip> -p <port> -i ~/.ssh/id_rsa`
- **Jupyter Lab** — built into template

### Step 2.2: Verify GPU

```bash
nvidia-smi
# Output check: NVIDIA A40, 48GB VRAM, driver loaded
```

### Step 2.3: Install vLLM (latest, supports Qwen3.6)

```bash
# System deps
apt-get update && apt-get install -y git curl

# vLLM install (FP8 support)
pip install --upgrade vllm
pip install --upgrade transformers
pip install huggingface_hub[hf_transfer]

# Fast download enable
export HF_HUB_ENABLE_HF_TRANSFER=1
```

### Step 2.4: Download Qwen3.6-35B-A3B-FP8

```bash
# Login to Hugging Face
huggingface-cli login --token $HF_TOKEN

# Download model to network volume (35GB, ~10-15 min)
huggingface-cli download Qwen/Qwen3.6-35B-A3B-FP8 \
  --local-dir /workspace/models/Qwen3.6-35B-A3B-FP8 \
  --local-dir-use-symlinks False
```

### Step 2.5: Start vLLM Server

```bash
# Production-ready vLLM command
vllm serve /workspace/models/Qwen3.6-35B-A3B-FP8 \
  --served-model-name qwen3.6-35b \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.92 \
  --max-num-seqs 32 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes \
  --trust-remote-code
```

**Verify it's running:**
```bash
# In another terminal
curl http://localhost:8000/v1/models
```

### Step 2.6: Test Inference

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.6-35b",
    "messages": [{"role":"user","content":"வணக்கம்! நீ யார்?"}],
    "max_tokens": 100
  }'
```

If response வந்தா → Model deployed successfully! ✅

---

## 📋 Phase 3: Make vLLM Persistent (auto-start)

Pod restart ஆனா vLLM server-ம் auto-start ஆகணும். `systemd` service create பண்ணணும்.

```bash
cat > /etc/systemd/system/vllm.service <<EOF
[Unit]
Description=vLLM Qwen3.6 Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/workspace
Environment="HF_HOME=/workspace/huggingface"
ExecStart=/usr/local/bin/vllm serve /workspace/models/Qwen3.6-35B-A3B-FP8 \\
  --served-model-name qwen3.6-35b \\
  --host 0.0.0.0 --port 8000 \\
  --max-model-len 16384 \\
  --gpu-memory-utilization 0.92 \\
  --max-num-seqs 32 \\
  --enable-auto-tool-choice \\
  --tool-call-parser hermes
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vllm
systemctl start vllm
systemctl status vllm  # check running
```

---

## 📋 Phase 4: FastAPI Gateway (API Key System)

இது second pod-ல or your own server-ல run பண்ணணும். GPU தேவையில்ல — small CPU instance enough.

### Architecture:

```
[User] → [api.yourdomain.com]
         ↓ API key auth
[FastAPI Gateway] (CPU instance, $5-10/mo)
         ↓
[RunPod vLLM Pod] (private network, A40, $317/mo)
```

### Files needed:

```
yourapi/
├── .env                    # secrets
├── .gitignore
├── docker-compose.yml
├── requirements.txt
├── app/
│   ├── main.py            # FastAPI app
│   ├── auth.py            # API key validation
│   ├── database.py        # PostgreSQL
│   ├── models.py          # SQLAlchemy models
│   ├── skills/
│   │   ├── invoice.py     # Invoice→JSON
│   │   ├── coding.py      # Code generation
│   │   └── reasoning.py   # Reasoning
│   └── llm_client.py      # vLLM call wrapper
└── tests/
```

(Complete code I'll generate next.)

---

## 📋 Phase 5: Domain Setup

### Step 5.1: Cloudflare DNS

1. Cloudflare → Add domain
2. Update nameservers at your registrar
3. DNS records:
   - **A record:** `api.yourdomain.com` → Gateway server IP
   - **Proxy:** Enable (orange cloud) for DDoS protection

### Step 5.2: SSL/HTTPS

Cloudflare automatic SSL (free tier) → enable "Full (strict)" mode.

### Step 5.3: Production server (Gateway)

Options for FastAPI host:
- **Cheapest:** RunPod CPU pod ($5/mo)
- **Reliable:** Hetzner CPX11 (€4/mo)
- **Easy:** Railway / Render (free tier or $5)
- **Enterprise:** AWS ECS / GCP Cloud Run

---

## 💰 Final Monthly Cost

| Item | Cost |
|------|-----:|
| RunPod A40 24/7 | $317 |
| Network Volume 100GB | $7 |
| Gateway server (CPU) | $5-10 |
| Domain (already have) | $0 |
| Cloudflare | $0 |
| Supabase Postgres (free) | $0 |
| Upstash Redis (free) | $0 |
| **Total** | **~$330/month** |

**Cost reduction tip:** Pod stop பண்ணினா only volume cost ($7) charge ஆகும். Demo / dev time-ல useful.

---

## 🔐 Security Checklist

- [ ] RunPod API key rotated (old key leaked)
- [ ] HF_TOKEN created with read-only permission
- [ ] All secrets in `.env` (not in code)
- [ ] `.env` in `.gitignore`
- [ ] vLLM port (8000) firewalled — only gateway can access
- [ ] Cloudflare proxy enabled (DDoS)
- [ ] Rate limiting in FastAPI gateway
- [ ] API keys hashed in database (bcrypt)
- [ ] HTTPS only (no HTTP)
- [ ] Database backups enabled

---

## 🧪 Testing Checklist

- [ ] vLLM responds to `/v1/models`
- [ ] vLLM responds to `/v1/chat/completions`
- [ ] Tamil prompts work
- [ ] Long context (16K) works
- [ ] Tool calling works (`tool_calls` in response)
- [ ] Gateway API key validation works
- [ ] Each skill endpoint returns correct format
- [ ] Rate limiting enforces correctly
- [ ] SSL certificate valid

---

## 📞 What's Next

1. ✅ A40 pod buy பண்ணினீங்க
2. ⏳ Network volume create
3. ⏳ Pod deploy
4. ⏳ Model download
5. ⏳ vLLM start
6. ⏳ Gateway code (I'll generate)
7. ⏳ Domain DNS setup
8. ⏳ Testing

**Domain name confirm பண்ணுங்க** — அப்போ gateway code, FastAPI app, database schema, Python SDK எல்லாம் build பண்றேன்.
