#!/usr/bin/env bash
#
# Simulate MDK GitHub Actions workflows locally (best-effort):
# - Mirrors the command shape of:
#   - .github/workflows/ui.yaml
#   - .github/workflows/core.yaml
# - Skips dependency-review (needs PR + GitHub Actions context)
#
# Output:
# - tmp/local-ci-summary.md
# - tmp/local-ci.log (full console log)
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_MD="${ROOT}/tmp/local-ci-summary.md"
OUT_LOG="${ROOT}/tmp/local-ci.log"

MIN_COVERAGE="${MIN_COVERAGE:-80}"
NODE_VERSION="${NODE_VERSION:-lts/*}"
PNPM_VERSION="${PNPM_VERSION:-10.5.0}"

UI_DIR="${ROOT}/ui-client"
CORE_DIR="${ROOT}/core"

mkdir -p "${ROOT}/tmp"
: >"${OUT_LOG}"

log() {
  {
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") $*"
    echo ""
  } | tee -a "${OUT_LOG}"
}

append_md() {
  local chunk=""
  if [ "${#}" -eq 0 ]; then
    return 0
  fi
  for chunk in "$@"; do
    # %b expands \n, \t, etc., which keeps markdown assembly ergonomic.
    printf "%b" "${chunk}" >>"${OUT_MD}"
  done
}

run_block() {
  local title="$1"
  shift

  append_md "## ${title}"$'\n\n'

  log "BEGIN: ${title}"

  set +e
  (
    cd "${ROOT}"
    eval "$@"
  ) 2>&1 | tee -a "${OUT_LOG}"
  local rc=${PIPESTATUS[0]}
  set -e

  log "END: ${title} (rc=${rc})"

  if [ "${rc}" -eq 0 ]; then
    append_md $'**Result:** PASS\n\n'
  else
    TOTAL_FAIL=$(( TOTAL_FAIL + 1 ))
    append_md $'**Result:** FAIL\n\n'
  fi

  return "${rc}"
}

ui_coverage_gate() {
  local min="${1}"
  (
    cd "${UI_DIR}"

    local lcov_count
    lcov_count="$(find . -type f -path '*/coverage/lcov.info' 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${lcov_count}" -gt 0 ]; then
      mapfile -t LCOV_FILES < <(find . -type f -path '*/coverage/lcov.info')
      local LF LH FNF FNH BRF BRH
      LF=$(awk -F: '/^LF:/ {sum+=$2} END {print sum+0}' "${LCOV_FILES[@]}")
      LH=$(awk -F: '/^LH:/ {sum+=$2} END {print sum+0}' "${LCOV_FILES[@]}")
      FNF=$(awk -F: '/^FNF:/ {sum+=$2} END {print sum+0}' "${LCOV_FILES[@]}")
      FNH=$(awk -F: '/^FNH:/ {sum+=$2} END {print sum+0}' "${LCOV_FILES[@]}")
      BRF=$(awk -F: '/^BRF:/ {sum+=$2} END {print sum+0}' "${LCOV_FILES[@]}")
      BRH=$(awk -F: '/^BRH:/ {sum+=$2} END {print sum+0}' "${LCOV_FILES[@]}")

      local lines_pct funcs_pct branch_pct
      lines_pct=$(awk -v h="$LH" -v f="$LF" 'BEGIN { if (f==0) print "0"; else printf "%.2f", (h/f)*100 }')
      funcs_pct=$(awk -v h="$FNH" -v f="$FNF" 'BEGIN { if (f==0) print "0"; else printf "%.2f", (h/f)*100 }')
      branch_pct=$(awk -v h="$BRH" -v f="$BRF" 'BEGIN { if (f==0) print "0"; else printf "%.2f", (h/f)*100 }')

      {
        echo "## UI Coverage Summary"
        echo
        echo "- Threshold: ${min}%"
        echo "- Lines: ${lines_pct}%"
        echo "- Functions: ${funcs_pct}%"
        echo "- Branches: ${branch_pct}%"
      }

      awk -v l="$lines_pct" -v fn="$funcs_pct" -v b="$branch_pct" -v m="$min" '
        BEGIN {
          if ((l + 0) < (m + 0) || (fn + 0) < (m + 0) || (b + 0) < (m + 0)) exit 1
          exit 0
        }
      '
      return $?
    fi

    mapfile -t JSON_FILES < <(find . -type f -path '*/coverage/coverage-final.json' 2>/dev/null)
    if [ "${#JSON_FILES[@]}" -eq 0 ]; then
      echo "No coverage artifacts found under ui-client (lcov.info or coverage-final.json)."
      return 2
    fi

    rm -rf .nyc_output
    mkdir -p .nyc_output
    local i=0
    for f in "${JSON_FILES[@]}"; do
      cp "$f" ".nyc_output/out-${i}.json"
      i=$((i + 1))
    done

    npx --yes nyc merge .nyc_output coverage-merged.json >/dev/null
    cp coverage-merged.json .nyc_output/out.json

    NYC_REPORT="$(npx --yes nyc report --reporter=text-summary 2>&1)"
    echo "${NYC_REPORT}"

    STMT="$(echo "${NYC_REPORT}" | sed -n 's/^Statements[^:]*: *\([0-9.]*\)%.*/\1/p')"
    BRANCH="$(echo "${NYC_REPORT}" | sed -n 's/^Branches[^:]*: *\([0-9.]*\)%.*/\1/p')"
    FN="$(echo "${NYC_REPORT}" | sed -n 's/^Functions[^:]*: *\([0-9.]*\)%.*/\1/p')"
    LINES="$(echo "${NYC_REPORT}" | sed -n 's/^Lines[^:]*: *\([0-9.]*\)%.*/\1/p')"

    {
      echo "## UI Coverage Summary (via nyc fallback)"
      echo
      echo "- Threshold: ${min}%"
      echo "- Statements: ${STMT:-N/A}%"
      echo "- Branches: ${BRANCH:-N/A}%"
      echo "- Functions: ${FN:-N/A}%"
      echo "- Lines: ${LINES:-N/A}%"
    }

    npx --yes nyc check-coverage --lines="$min" --statements="$min" --functions="$min" --branches="$min"
    return $?
  )
}

core_coverage_gate() {
  local min="${1}"
  (
    cd "${CORE_DIR}"

    if [ -f coverage/lcov.info ]; then
      local LF LH FNH FNF BRH BRF
      LF=$(awk -F: '/^LF:/ {sum+=$2} END {print sum+0}' coverage/lcov.info)
      LH=$(awk -F: '/^LH:/ {sum+=$2} END {print sum+0}' coverage/lcov.info)
      FNF=$(awk -F: '/^FNF:/ {sum+=$2} END {print sum+0}' coverage/lcov.info)
      FNH=$(awk -F: '/^FNH:/ {sum+=$2} END {print sum+0}' coverage/lcov.info)
      BRF=$(awk -F: '/^BRF:/ {sum+=$2} END {print sum+0}' coverage/lcov.info)
      BRH=$(awk -F: '/^BRH:/ {sum+=$2} END {print sum+0}' coverage/lcov.info)

      local lines_pct funcs_pct branch_pct
      lines_pct=$(awk -v h="$LH" -v f="$LF" 'BEGIN { if (f==0) print "0"; else printf "%.2f", (h/f)*100 }')
      funcs_pct=$(awk -v h="$FNH" -v f="$FNF" 'BEGIN { if (f==0) print "0"; else printf "%.2f", (h/f)*100 }')
      branch_pct=$(awk -v h="$BRH" -v f="$BRF" 'BEGIN { if (f==0) print "0"; else printf "%.2f", (h/f)*100 }')

      {
        echo "## Core Coverage Summary"
        echo
        echo "- Threshold: ${min}%"
        echo "- Lines: ${lines_pct}%"
        echo "- Functions: ${funcs_pct}%"
        echo "- Branches: ${branch_pct}%"
      }

      awk -v l="$lines_pct" -v fn="$funcs_pct" -v b="$branch_pct" -v m="$min" '
        BEGIN {
          if ((l + 0) < (m + 0) || (fn + 0) < (m + 0) || (b + 0) < (m + 0)) exit 1
          exit 0
        }
      '
      return $?
    fi

    if [ -f coverage/coverage-final.json ]; then
      rm -rf .nyc_output
      mkdir -p .nyc_output
      cp coverage/coverage-final.json .nyc_output/out.json

      NYC_REPORT="$(npx --yes nyc report --reporter=text-summary 2>&1)"
      echo "${NYC_REPORT}"

      STMT="$(echo "${NYC_REPORT}" | sed -n 's/^Statements[^:]*: *\([0-9.]*\)%.*/\1/p')"
      BRANCH="$(echo "${NYC_REPORT}" | sed -n 's/^Branches[^:]*: *\([0-9.]*\)%.*/\1/p')"
      FN="$(echo "${NYC_REPORT}" | sed -n 's/^Functions[^:]*: *\([0-9.]*\)%.*/\1/p')"
      LINES="$(echo "${NYC_REPORT}" | sed -n 's/^Lines[^:]*: *\([0-9.]*\)%.*/\1/p')"

      {
        echo "## Core Coverage Summary (via nyc fallback)"
        echo
        echo "- Threshold: ${min}%"
        echo "- Statements: ${STMT:-N/A}%"
        echo "- Branches: ${BRANCH:-N/A}%"
        echo "- Functions: ${FN:-N/A}%"
        echo "- Lines: ${LINES:-N/A}%"
      }

      npx --yes nyc check-coverage --lines="$min" --statements="$min" --functions="$min" --branches="$min"
      return $?
    fi

    echo "No coverage artifacts found under core (coverage/lcov.info or coverage/coverage-final.json)."
    return 2
  )
}

TOTAL_FAIL=0

: >"${OUT_MD}"
append_md $"# Local CI simulation report\n\nRepo root: \`${ROOT}\`\n\n> Note: this is a best-effort local simulation. It **does not** run GitHub Actions itself.\n> Dependency review is intentionally skipped locally.\n\n"

# ===== UI =====
run_block "MDK UI: pnpm install" "cd '${UI_DIR}' && corepack prepare pnpm@${PNPM_VERSION} --activate && pnpm install --frozen-lockfile" || true

run_block "MDK UI: lint" "cd '${UI_DIR}' && pnpm run lint" || true

run_block "MDK UI: typecheck" "cd '${UI_DIR}' && pnpm run typecheck" || true

run_block "MDK UI: test:coverage||test" "cd '${UI_DIR}' && (pnpm run test:coverage || pnpm test)" || true

COVER_RC=0
set +e
COVER_SUM="$(ui_coverage_gate "${MIN_COVERAGE}")"
COVER_RC=$?
set -e
append_md "### UI coverage gate (${MIN_COVERAGE}%)\n\n"

append_md '```text'"\n${COVER_SUM}\n"'```'"\n\n"
if [ "${COVER_RC}" -eq 0 ]; then
  append_md "**Result:** PASS\n\n"
else
  TOTAL_FAIL=$(( TOTAL_FAIL + 1 ))
  append_md "**Result:** FAIL\n\n"
fi

run_block "MDK UI: security audits (warnings allowed)" "
  cd '${UI_DIR}'
  set +e
  pnpm audit --audit-level=moderate || true
  pnpm audit --audit-level=high || true
" || true

run_block "MDK UI: build" "cd '${UI_DIR}' && pnpm run build" || true

BUNDLE_SUM="$(bash -lc "cd '${UI_DIR}' && pnpm run size -- --markdown" )"
append_md "### UI bundle markdown (simulate job summary excerpt)\n\n"
append_md "${BUNDLE_SUM}\n\n"

# ===== CORE =====
run_block "MDK Core: npm ci + package preinstall hooks" "
  cd '${CORE_DIR}'
  export NODE_EXTRA_CA_CERTS=''
  export NODE_TLS_REJECT_UNAUTHORIZED=''

  NODE_VERSION_PROXY='${NODE_VERSION}'
  if command -v nvm >/dev/null 2>&1; then
    NODE_VERSION_PROXY='system'
    echo \"nvm present; using installed node for local sim\"
  fi

  cd '${CORE_DIR}'
  npm ci
" || true

run_block "MDK Core: lockfile sanity (no workspace mutation)" "
  cd '${CORE_DIR}'
  set -e
  TMP_LOCK=\"$(mktemp -t mdk-lock.XXXXXX)\"
  trap 'rm -f \"\${TMP_LOCK}\"' EXIT
  cp package-lock.json \"\${TMP_LOCK}\"
  npm install --package-lock-only --no-audit --no-fund
  cmp -s package-lock.json \"\${TMP_LOCK}\"
  git checkout -- package-lock.json >/dev/null 2>&1 || true
" || true

run_block "MDK Core: audit signatures/high (warnings OK)" "
  cd '${CORE_DIR}'
  set +e
  npm audit signatures || true
  npm exec --yes -- audit-ci@7 --config audit-ci.jsonc || true
" || true

run_block "MDK Core: lint/typecheck/tests" "
  cd '${CORE_DIR}'
  npm run lint --if-present
  npm run typecheck --if-present
  (npm run test:coverage --if-present || npm test --if-present)
" || true

COVER_CORE_RC=0
set +e
COVER_CORE_SUM="$(core_coverage_gate "${MIN_COVERAGE}")"
COVER_CORE_RC=$?
set -e
append_md "### Core coverage gate (${MIN_COVERAGE}%)\n\n"
append_md '```text'"\n${COVER_CORE_SUM}\n"'```'"\n\n"
if [ "${COVER_CORE_RC}" -eq 0 ]; then
  append_md "**Result:** PASS\n\n"
else
  TOTAL_FAIL=$(( TOTAL_FAIL + 1 ))
  append_md "**Result:** FAIL\n\n"
fi

run_block "MDK Core: build" "cd '${CORE_DIR}' && npm run build --if-present" || true

TOTAL_RC=0
if [ "${TOTAL_FAIL}" -gt 0 ]; then
  TOTAL_RC=1
fi

append_md "### Summary\n\n"
append_md "- Failed blocks (excluding audits): ${TOTAL_FAIL}\n"
append_md "- Exit code for automation: ${TOTAL_RC}\n\n"

exit "${TOTAL_RC}"
