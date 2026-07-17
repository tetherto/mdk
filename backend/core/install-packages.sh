#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="${1:-install}"
PACKAGES=(client gateway kernel mdk mdk-worker mock-control-service plugins)

run_npm () {
  local dir="$1"
  if [ "$MODE" = "ci" ] && [ -f "$dir/package-lock.json" ]; then
    npm ci --prefix "$dir"
  else
    npm install --prefix "$dir"
  fi
}

echo "[mdk-core] Installing dependencies (${MODE}) under ${ROOT}..."

for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    echo "[mdk-core] -> ${pkg}/"
    run_npm "$pkg"
  fi
done

if [ -f package.json ]; then
  echo "[mdk-core] -> ./ (root)"
  run_npm "."
fi

echo "[mdk-core] Done."
