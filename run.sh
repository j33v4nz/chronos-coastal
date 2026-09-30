#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"
echo 'CHRONOS COASTAL · Community resilience workspace'

if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
# Temporary executable storage also supports noexec project mounts.
CHRONOS_ENV_DIR="${CHRONOS_VENV_DIR:-/tmp/chronos-coastal-venv-$UID}"
if [ ! -x "$CHRONOS_ENV_DIR/bin/python" ]; then
    python3 -m venv "$CHRONOS_ENV_DIR"
fi
if ! "$CHRONOS_ENV_DIR/bin/python" -c 'import fastapi, uvicorn, pydantic, networkx, numpy, scipy, PIL, websockets, httpx, dotenv, google.genai' >/dev/null 2>&1; then
    "$CHRONOS_ENV_DIR/bin/python" -m pip install --disable-pip-version-check -r backend/requirements.txt
fi

if [ "${CHRONOS_SKIP_BUILD:-0}" != 1 ]; then
    CHRONOS_BUILD_DIR="$(mktemp -d /tmp/chronos-frontend-XXXXXX)"
    trap 'rm -rf "$CHRONOS_BUILD_DIR"' EXIT
    cp frontend/package.json frontend/package-lock.json frontend/index.html frontend/*.config.js "$CHRONOS_BUILD_DIR/"
    cp -R frontend/src "$CHRONOS_BUILD_DIR/"
    if [ -d frontend/public ]; then cp -R frontend/public "$CHRONOS_BUILD_DIR/"; fi
    if [ -f frontend/node_modules/vite/bin/vite.js ]; then
        ln -s "$PROJECT_ROOT/frontend/node_modules" "$CHRONOS_BUILD_DIR/node_modules"
    else
        (cd "$CHRONOS_BUILD_DIR" && npm ci --no-audit --no-fund)
    fi
    (cd "$CHRONOS_BUILD_DIR" && npm run build)
    mkdir -p frontend/dist
    cp -R "$CHRONOS_BUILD_DIR/dist/." frontend/dist/
    rm -rf "$CHRONOS_BUILD_DIR"
    trap - EXIT
elif [ ! -f frontend/dist/index.html ]; then
    echo 'No frontend build found. Run once without CHRONOS_SKIP_BUILD=1.' >&2
    exit 1
fi

# Parse .env as data; process settings take precedence.
CHRONOS_HOST="$("$CHRONOS_ENV_DIR/bin/python" -c 'import os; from dotenv import dotenv_values; print(os.getenv("HOST") or dotenv_values("backend/.env").get("HOST") or "127.0.0.1")')"
CHRONOS_PORT="$("$CHRONOS_ENV_DIR/bin/python" -c 'import os; from dotenv import dotenv_values; print(os.getenv("PORT") or dotenv_values("backend/.env").get("PORT") or "8000")')"
export PYTHONPATH="$PROJECT_ROOT/backend${PYTHONPATH:+:$PYTHONPATH}"
echo "Dashboard: http://localhost:$CHRONOS_PORT"
exec "$CHRONOS_ENV_DIR/bin/python" -m uvicorn app.main:app --host "$CHRONOS_HOST" --port "$CHRONOS_PORT" --app-dir backend
