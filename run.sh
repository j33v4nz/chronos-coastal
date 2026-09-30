#!/usr/bin/env bash
# ==============================================================================
# CHRONOS-COASTAL: National Physics-Coupled Compound Inundation & Swarm Engine
# Pan-India Autonomous Digital Twin Quickstart Launcher
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "  🌊 CHRONOS-COASTAL: NATIONAL DISASTER RESILIENCE DIGITAL TWIN"
echo "  Physics-Coupled Compound Inundation & Critical Infrastructure Swarm"
echo "  Covering India's 7,516 km Coastline: Kochi | Chennai | Mumbai | Odisha"
echo "======================================================================"

# 1. Environment initialization
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        echo "[+] Initializing backend/.env from backend/.env.example..."
        cp backend/.env.example backend/.env
    else
        echo "[+] Creating default backend/.env..."
        cat << 'EOF' > backend/.env
GEMINI_API_KEY=
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=production
EOF
    fi
fi

# 2. Check and install Python dependencies if needed
if ! python3 -c "import fastapi, uvicorn, pydantic, networkx, numpy, scipy, PIL, websockets" &>/dev/null; then
    echo "[+] Installing backend dependencies from backend/requirements.txt..."
    python3 -m pip install -q -r backend/requirements.txt
fi

# 3. Check and build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "[+] Building frontend production bundle..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "[+] Installing frontend dependencies..."
        npm install --silent
    fi
    npm run build
    cd "$PROJECT_ROOT"
fi

# 4. Export Python path
export PYTHONPATH="$PROJECT_ROOT/backend:$PYTHONPATH"

# 5. Port configuration
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo ""
echo "🚀 Launching Chronos Swarm Core & Digital Twin Gateway..."
echo "📍 Mission Control Dashboard: http://localhost:${PORT}"
echo "📡 Swarm Priority WebSocket:  ws://localhost:${PORT}/ws/tactical-feed"
echo "📖 OpenAPI Documentation:     http://localhost:${PORT}/docs"
echo "🎙️ Live Hackathon Pitch Mode: Available directly in UI top-bar"
echo "📊 Model Evals & Benchmarks:  Available in UI top-bar & http://localhost:${PORT}/api/evals/results"
echo "======================================================================"
echo ""

exec python3 -m uvicorn app.main:app --host "$HOST" --port "$PORT" --app-dir backend
