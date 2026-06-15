#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "[mdk-workers] Running tests under ${ROOT}..."

while IFS= read -r pkgjson; do
  dir=$(dirname "$pkgjson")
  if [ "$dir" = "$ROOT" ]; then
    continue
  fi
  if ! node -e "const p=require(process.argv[1]); process.exit(p.scripts&&p.scripts.test?0:1)" "$pkgjson" 2>/dev/null; then
    continue
  fi
  rel="${dir#${ROOT}/}"
  echo "[mdk-workers] -> ${rel}/"
  npm test --prefix "$dir" || exit 1
done < <(find "$ROOT" -name package.json -not -path '*/node_modules/*' | sort)

echo "[mdk-workers] Done."
