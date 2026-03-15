#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ""
echo "  ⚡ ADB Commander Pro v3.1"
echo ""

command -v adb &>/dev/null || echo "  ⚠  WARNING: adb not found in PATH"

echo "  [1/3] Installing Python deps..."
cd "$DIR/backend" && pip install -r requirements.txt -q

echo "  [2/3] Starting backend on 0.0.0.0:8000 (all interfaces)..."
uvicorn main:app --host 0.0.0.0 --reload --port 8000 &
BPID=$!
sleep 2

echo "  [3/3] Starting frontend..."
cd "$DIR/frontend" && npm install --silent && npm run dev &
FPID=$!
sleep 3

# Show LAN IPs
echo ""
echo "  =================================================="
echo "  Local    : http://localhost:5173"
python3 -c "import socket; s=socket.socket(); s.connect(('8.8.8.8',80)); ip=s.getsockname()[0]; s.close(); print(f'  Network  : http://{ip}:5173')" 2>/dev/null || true
echo "  API Docs : http://localhost:8000/api/docs"
echo ""
echo "  For remote access: Wireless > Remote Access > Start Tunnel"
echo "  =================================================="
echo ""
echo "  Press Ctrl+C to stop."

command -v xdg-open &>/dev/null && xdg-open http://localhost:5173 &
command -v open      &>/dev/null && open      http://localhost:5173 &

trap "kill $BPID $FPID 2>/dev/null; echo Stopped." INT TERM
wait