#!/usr/bin/env bash
# Markdownlint on PR-changed docs (same ruleset as `npm run lint:md`, scoped to
# the diff). Mirrors the mdk-docs `lint-markdown` CI job, but resolves the base
# from the PR event like .github/workflows/link-check.yml does — mdk-prv PRs
# target main/develop/staging/release/**, so there is no single fixed base ref.
#
# Locally: VERIFY_BASE_REF=origin/main bash docs/scripts/lint-md-pr.sh
# In CI:   BASE_SHA / HEAD_SHA are supplied by the workflow.
set -euo pipefail

cd "$(dirname "$0")/../.."

if [ -n "${BASE_SHA:-}" ] && [ -n "${HEAD_SHA:-}" ]; then
  base="$BASE_SHA"
  head="$HEAD_SHA"
else
  base_ref="${VERIFY_BASE_REF:-origin/main}"
  if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
    echo "Missing ref ${base_ref}. Fetch it first, e.g.:"
    echo "  git fetch origin main"
    exit 1
  fi
  base="$base_ref"
  head="HEAD"
fi

# Three-dot diff vs merge-base — the same set GitHub shows under "Files changed".
# Scope mirrors the `lint:md` globs and .markdownlintignore: docs/, any README.md
# (root or package-level), excluding build output and scaffold templates.
files=()
while IFS= read -r f; do
  [ -n "$f" ] && files+=("$f")
done < <(
  git diff --name-only --diff-filter=ACMRT "${base}...${head}" \
    | grep -E '^docs/.*\.md$|(^|/)README\.md$' \
    | grep -Ev '(^|/)(node_modules|dist|templates|worker-template)/' || true
)

if [ ${#files[@]} -eq 0 ]; then
  echo "No docs markdown or README.md in the diff vs ${base}; skipping markdownlint."
  exit 0
fi

echo "Linting ${#files[@]} file(s) vs ${base}:"
printf '  %s\n' "${files[@]}"
npx markdownlint "${files[@]}"
