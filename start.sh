#!/bin/bash
# ============================================================
# Avaniko AI — Auto Startup Script
# Starts vLLM (port 8000) + Dashboard (port 2222)
# ============================================================

LOG_DIR="/workspace/logs"
mkdir -p "$LOG_DIR"

echo "========================================"
echo " Avaniko AI Gateway — Starting Up"
echo "========================================"

# ── 1. Activate venv ──────────────────────────────────────
source /workspace/venv/bin/activate

# ── 2. Start vLLM in background ───────────────────────────
echo "[1/3] Starting vLLM (port 8000)..."

nohup vllm serve palmfuture/Qwen3.6-35B-A3B-GPTQ-Int4 \
  --served-model-name qwen3.6-35b \
  --host 0.0.0.0 \
  --port 8000 \
  --enforce-eager \
  --trust-remote-code \
  --gpu-memory-utilization 0.8 \
  --max-model-len 8192 \
  > "$LOG_DIR/vllm.log" 2>&1 &

VLLM_PID=$!
echo "[vLLM] PID: $VLLM_PID"

# ── 3. Start Dashboard immediately (no wait for vLLM) ─────
echo "[2/3] Starting Dashboard (port 1111)..."

nohup uvicorn runbod_main:app \
  --host 0.0.0.0 \
  --port 1111 \
  --workers 1 \
  > "$LOG_DIR/dashboard.log" 2>&1 &

DASH_PID=$!
echo "[Dashboard] PID: $DASH_PID"

sleep 3

# ── 5. Health check ───────────────────────────────────────
if curl -sf http://localhost:2222/health > /dev/null 2>&1; then
  echo ""
  echo "========================================"
  echo " All services running!"
  echo " vLLM      → http://localhost:8000"
  echo " Dashboard → http://localhost:2222"
  echo " Logs      → $LOG_DIR/"
  echo "========================================"
else
  echo "[ERROR] Dashboard failed. Check: $LOG_DIR/dashboard.log"
fi
