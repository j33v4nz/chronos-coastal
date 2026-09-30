#!/usr/bin/env bash
# ==============================================================================
# CHRONOS-COASTAL: Scenario modeling workspace launcher
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "  🌊 CHRONOS-COASTAL: COASTAL SCENARIO WORKSPACE"
echo "  Sample corridors: Kochi | Chennai | Mumbai | Odisha"
echo "======================================================================"

# 1. Environment initialization
if [ ! -f "backend/.env" ]; then
    echo "[+] Creating backend/.env..."
    cat << 'EOF' > backend/.env
# CHRONOS-COASTAL Environment Configuration
# Optional: Google GenAI API Key for Gemini 2.5 Flash
# If left empty, system automatically engages the zero-downtime synthetic geotechnical engine
GEMINI_API_KEY=

PORT=8000
HOST=0.0.0.0
ENVIRONMENT=production
EOF
fi

# Read launcher settings from the generated environment file.
CHRONOS_EXISTING_KEY="$GEMINI_API_KEY"
CHRONOS_EXISTING_PORT="$PORT"
CHRONOS_EXISTING_HOST="$HOST"
set -a
source backend/.env
set +a
if [ -n "$CHRONOS_EXISTING_KEY" ]; then export GEMINI_API_KEY="$CHRONOS_EXISTING_KEY"; fi
if [ -n "$CHRONOS_EXISTING_PORT" ]; then export PORT="$CHRONOS_EXISTING_PORT"; fi
if [ -n "$CHRONOS_EXISTING_HOST" ]; then export HOST="$CHRONOS_EXISTING_HOST"; fi

# 2. Keep executables on an executable filesystem (some workspaces use noexec mounts)
CHRONOS_ENV_DIR="/tmp/chronos-coastal-venv-$UID"
if [ -n "$CHRONOS_VENV_DIR" ]; then
    CHRONOS_ENV_DIR="$CHRONOS_VENV_DIR"
fi
if [ ! -x "$CHRONOS_ENV_DIR/bin/python" ]; then
    echo "[+] Creating backend virtual environment..."
    python3 -m venv "$CHRONOS_ENV_DIR"
fi
"$CHRONOS_ENV_DIR/bin/python" -m pip install --disable-pip-version-check -r backend/requirements.txt

# 3. Check and build frontend if needed
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[+] Building frontend production bundle..."
    CHRONOS_BUILD_DIR="$(mktemp -d /tmp/chronos-frontend-XXXXXX)"
    trap 'rm -rf "$CHRONOS_BUILD_DIR"' EXIT
    cp frontend/package.json frontend/package-lock.json frontend/index.html frontend/postcss.config.js frontend/tailwind.config.js frontend/vite.config.js "$CHRONOS_BUILD_DIR/"
    cp -R frontend/src "$CHRONOS_BUILD_DIR/"
    (
        cd "$CHRONOS_BUILD_DIR"
        npm ci --no-audit --no-fund
        npm run build
    )
    cp -R "$CHRONOS_BUILD_DIR/dist" frontend/
    rm -rf "$CHRONOS_BUILD_DIR"
    trap - EXIT
fi

# 4. Export Python path
export PYTHONPATH="$PROJECT_ROOT/backend:$PYTHONPATH"

# 4. Port configuration
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo ""
echo "🚀 Launching Chronos Swarm Core & Digital Twin Gateway..."
echo "📍 Mission Control Dashboard: http://localhost:${PORT}"
echo "📡 Swarm Priority WebSocket:  ws://localhost:${PORT}/ws/tactical-feed"
echo "📖 OpenAPI Documentation:     http://localhost:${PORT}/docs"
echo "📋 Demo Guide: Available in the dashboard header"
echo "======================================================================"
echo ""

exec "$CHRONOS_ENV_DIR/bin/python" -m uvicorn app.main:app --host "$HOST" --port "$PORT" --app-dir backend
