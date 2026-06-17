#!/bin/sh
set -e

CORE_MARKER="/app/repo/backend/core/.docker-installed"
WORKERS_MARKER="/app/repo/backend/workers/.docker-installed"

if [ ! -f "$CORE_MARKER" ]; then
  echo "[mdk-site] Installing core packages (first run)..."
  cd /app/repo/backend/core && sh install-packages.sh ci
  touch "$CORE_MARKER"
fi

if [ ! -f "$WORKERS_MARKER" ]; then
  echo "[mdk-site] Installing worker packages (first run)..."
  cd /app/repo/backend/workers && sh install-packages.sh ci
  touch "$WORKERS_MARKER"
fi

cd /app/repo/examples/core/site
exec node mdk/worker.js
