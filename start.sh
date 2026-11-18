#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

if [ -x "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3" ]; then
    PYTHON_BIN="/Library/Frameworks/Python.framework/Versions/3.12/bin/python3"
elif [ -x "$PROJECT_ROOT/.venv/bin/python" ]; then
    PYTHON_BIN="$PROJECT_ROOT/.venv/bin/python"
else
    PYTHON_BIN="python3"
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
MODE="${1:-all}"

port_is_open() {
    "$PYTHON_BIN" - "$1" <<'PY'
import socket
import sys

with socket.socket() as sock:
    sock.settimeout(0.5)
    sys.exit(0 if sock.connect_ex(("127.0.0.1", int(sys.argv[1]))) == 0 else 1)
PY
}

backend_is_healthy() {
    "$PYTHON_BIN" - "$BACKEND_PORT" <<'PY'
import json
import sys
from urllib.request import urlopen

try:
    with urlopen(f"http://127.0.0.1:{sys.argv[1]}/api/health", timeout=2) as response:
        body = json.load(response)
    sys.exit(0 if body.get("version") == "2.0.0" and body.get("status") in {"ok", "degraded"} else 1)
except Exception:
    sys.exit(1)
PY
}

frontend_is_healthy() {
    "$PYTHON_BIN" - "$FRONTEND_PORT" <<'PY'
import sys
from urllib.request import urlopen

try:
    root = f"http://127.0.0.1:{sys.argv[1]}"
    with urlopen(root + "/", timeout=2) as response:
        page = response.read(20000)
    sys.exit(0 if b"Cyber-Attack Network Intrusion Profiler" in page else 1)
except Exception:
    sys.exit(1)
PY
}

port_conflict() {
    local service="$1"
    local port="$2"
    echo "Error: port $port is already in use, but the $service service did not pass its health check." >&2
    echo "Stop the conflicting process, then rerun ./start.sh. No existing process was terminated." >&2
    exit 1
}

start_backend() {
    echo "Starting FastAPI backend on http://localhost:$BACKEND_PORT ..."
    "$PYTHON_BIN" -m uvicorn backend.app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
    BACKEND_PID=$!
    BACKEND_STARTED=1
}

start_frontend() {
    echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
    API_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" \
        "$PYTHON_BIN" "$PROJECT_ROOT/frontend/serve.py" &
    FRONTEND_PID=$!
    FRONTEND_STARTED=1
}

case "$MODE" in
    backend)
        if backend_is_healthy; then
            echo "Backend is already running at http://localhost:$BACKEND_PORT. Reusing it."
            exit 0
        fi
        port_is_open "$BACKEND_PORT" && port_conflict "backend" "$BACKEND_PORT"
        exec "$PYTHON_BIN" -m uvicorn backend.app.main:app --host 0.0.0.0 --port "$BACKEND_PORT"
        ;;
    frontend)
        if frontend_is_healthy; then
            echo "Frontend and API are already available at http://localhost:$FRONTEND_PORT. Reusing them."
            exit 0
        fi
        port_is_open "$FRONTEND_PORT" && port_conflict "frontend" "$FRONTEND_PORT"
        API_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" \
            exec "$PYTHON_BIN" "$PROJECT_ROOT/frontend/serve.py"
        ;;
    all|*)
        BACKEND_STARTED=0
        FRONTEND_STARTED=0
        BACKEND_PID=""
        FRONTEND_PID=""

        BACKEND_READY=0
        FRONTEND_READY=0
        if backend_is_healthy; then
            BACKEND_READY=1
            echo "Backend already healthy on port $BACKEND_PORT; reusing it."
        elif port_is_open "$BACKEND_PORT"; then
            port_conflict "backend" "$BACKEND_PORT"
        fi

        if frontend_is_healthy; then
            FRONTEND_READY=1
            echo "Frontend already healthy on port $FRONTEND_PORT; reusing it."
        elif port_is_open "$FRONTEND_PORT"; then
            port_conflict "frontend" "$FRONTEND_PORT"
        fi

        echo "=========================================================="
        echo "  Cyber-Attack Intrusion Profiler: Full-Stack Launcher"
        echo "=========================================================="
        echo "Backend:  http://localhost:$BACKEND_PORT (API docs at /docs)"
        echo "Frontend: http://localhost:$FRONTEND_PORT"
        echo "Press CTRL+C to stop only servers started by this launcher."
        echo "----------------------------------------------------------"

        if [ "$BACKEND_READY" -eq 0 ]; then start_backend; fi
        if [ "$FRONTEND_READY" -eq 0 ]; then start_frontend; fi

        if [ "$BACKEND_STARTED" -eq 0 ] && [ "$FRONTEND_STARTED" -eq 0 ]; then
            echo "Both services are already running; nothing new was started."
            exit 0
        fi

        cleanup() {
            trap - EXIT INT TERM
            echo "\nStopping servers started by this launcher..."
            if [ "$BACKEND_STARTED" -eq 1 ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
            if [ "$FRONTEND_STARTED" -eq 1 ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
            if [ "$BACKEND_STARTED" -eq 1 ]; then wait "$BACKEND_PID" 2>/dev/null || true; fi
            if [ "$FRONTEND_STARTED" -eq 1 ]; then wait "$FRONTEND_PID" 2>/dev/null || true; fi
            echo "Servers stopped."
        }

        trap cleanup EXIT INT TERM
        wait
        ;;
esac
