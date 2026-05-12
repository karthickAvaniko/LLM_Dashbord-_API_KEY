#!/bin/bash
# ═══════════════════════════════════════════════
#  Deploy ALL files to RunPod Network Volume
#  Usage: bash deploy_to_runpod.sh
# ═══════════════════════════════════════════════

POD_SSH="edc0k6b2n8o715-6441129a@ssh.runpod.io"
SSH_KEY="$HOME/.ssh/id_ed25519"

echo "======================================"
echo " Avaniko AI Gateway - RunPod Deploy"
echo "======================================"

# 1. Upload gateway.py (startup wrapper)
echo "[1/5] Uploading gateway.py..."
scp -i "$SSH_KEY" "e:/llmDashboard/gateway.py" "$POD_SSH:/workspace/gateway.py"

# 2. Upload backend/ directory
echo "[2/5] Uploading backend/..."
scp -i "$SSH_KEY" -r "e:/llmDashboard/backend" "$POD_SSH:/workspace/"

# 3. Upload dist/ (React build)
echo "[3/5] Uploading dist/ (React frontend)..."
scp -i "$SSH_KEY" -r "e:/llmDashboard/dist" "$POD_SSH:/workspace/"

# 4. Create requirements.txt on server
echo "[4/5] Installing Python dependencies..."
ssh -i "$SSH_KEY" "$POD_SSH" "pip install fastapi uvicorn httpx PyJWT python-multipart 2>&1 | tail -5"

# 5. Start gateway
echo "[5/5] Starting gateway..."
ssh -i "$SSH_KEY" "$POD_SSH" "pkill -f 'gateway.py' 2>/dev/null; sleep 1; cd /workspace && nohup python gateway.py > /workspace/gateway.log 2>&1 & sleep 2 && echo 'Gateway started!' && tail -5 /workspace/gateway.log"

echo ""
echo "======================================"
echo " Done! Gateway running on port 1111"
echo " URL: https://edc0k6b2n8o715-1111.proxy.runpod.net"
echo "======================================"
