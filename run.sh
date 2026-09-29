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
    echo "[+] Initializing backend/.env from backend/.env.example..."
    cat << 'EOF' > backend/.env
# CHRONOS-COASTAL Environment Configuration
# Optional: Google GenAI API Key for Gemini 3.7 / 2.5 Flash
# If left empty, system automatically engages the zero-downtime synthetic geotechnical engine
GEMINI_API_KEY=

PORT=8000
HOST=0.0.0.0
ENVIRONMENT=production
EOF
fi

# 2. Check and build frontend if needed
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

# 3. Export Python path
export PYTHONPATH="$PROJECT_ROOT/backend:$PYTHONPATH"

# 4. Port configuration
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo ""
echo "🚀 Launching Chronos Swarm Core & Digital Twin Gateway..."
echo "📍 Mission Control Dashboard: http://localhost:${PORT}"
echo "📡 Swarm Priority WebSocket:  ws://localhost:${PORT}/ws/tactical-feed"
echo "📖 OpenAPI Documentation:     http://localhost:${PORT}/docs"
echo "🎙️ Live Hackathon Pitch Mode: Available directly in UI top-bar"
echo "======================================================================"
echo ""

exec python3 -m uvicorn app.main:app --host "$HOST" --port "$PORT" --app-dir backend
