#!/usr/bin/env bash
# Appends Markdown to stdout: high/critical rows from npm audit --json output.
set -euo pipefail
audit_json="${1:-}"
if [[ -z "${audit_json}" || ! -f "${audit_json}" ]]; then
  echo "usage: $0 npm-audit.json" >&2
  exit 1
fi

jq -r "$(cat <<'JQ'
def via_detail(v):
  [ v.via[]?
    | if type == "object" then
        ( "[" + (.title // .name | gsub("\\|"; "/") ) + "](" + (.url // "") + ")" )
      elif type == "string" then
        "`\(.)`"
      else
        tostring
      end
    ]
  | join(" · ");

(.vulnerabilities // {})
| to_entries
| map(select(.value.severity == "high" or .value.severity == "critical"))
| sort_by(.key)
| (. | length) as $n
| if $n == 0 then
  "### npm audit — packages at high / critical (0)\n\n_None reported_\n\n"
else
  (
    "### npm audit — packages at high / critical (\($n))\n\n" +
    "| Package | Severity | Advisors / dependents |\n" +
    "| :--- | :--- | :--- |\n" +
    ([ .[] |
        "| `\(.key)` | \(.value.severity | ascii_upcase) | \(via_detail(.value) | gsub("\\|"; "¦")) |"
    ] | join("\n")) +
    "\n\n"
  )
end
JQ
)" "${audit_json}"
