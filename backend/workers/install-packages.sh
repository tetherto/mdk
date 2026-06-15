#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="${1:-install}"

run_npm () {
  local dir="$1"
  if [ "$MODE" = "ci" ] && [ -f "$dir/package-lock.json" ]; then
    npm ci --prefix "$dir"
  else
    npm install --prefix "$dir"
  fi
}

echo "[mdk-workers] Installing dependencies (${MODE}) under ${ROOT}..."

find "$ROOT" -name package.json -not -path '*/node_modules/*' | sort | while IFS= read -r pkgjson; do
  dir=$(dirname "$pkgjson")
  if [ "$dir" = "$ROOT" ]; then
    continue
  fi
  rel="${dir#${ROOT}/}"
  echo "[mdk-workers] -> ${rel}/"
  run_npm "$dir"
done

if [ -f package.json ]; then
  echo "[mdk-workers] -> ./ (root)"
  run_npm "."
fi

echo "[mdk-workers] Done."
