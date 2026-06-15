#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "Removing node_modules under ${ROOT}..."
find "$ROOT" -name node_modules -type d -prune -exec rm -rf {} +

echo "Removing package-lock.json under ${ROOT}..."
find "$ROOT" -name package-lock.json -type f -delete

echo "Done."
