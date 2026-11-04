---
name: mdk-publish-security
description: >
  Run the pre-publish security audit for every publishable @tetherto/mdk-*
  package (or any non-private package in an npm monorepo). Use when preparing an
  npm release, when asked to "security check the packages", "audit before
  publish", "run the publish checklist", or to review packages for auth bypass,
  injection, command execution, path traversal, SSRF, prototype pollution,
  unsafe deserialization, secret exposure, crypto mistakes, insecure defaults,
  RPC trust boundaries, privilege escalation or TOCTOU issues, or to check
  that packed tarballs install and import cleanly, what consumers get from
  npm audit without the root overrides, and who owns the npm scope.
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Pre-publish security audit

Produces one Markdown report listing every publishable package, every check run
on it, and the issues that must be fixed before `npm publish`. The checks combine
the repo's `PUBLISH_CHECKLIST.md` (security section + per-package extras) and the
publish blockers in `NPM_PACKAGES.md` with a manual review for 18 vulnerability
classes ([`references/vuln-classes.md`](./references/vuln-classes.md)).

This skill never edits package source, never publishes, and never runs install
scripts of dependencies. Without `--smoke` it only reads the checkout and writes
the report. **`--smoke` is not read-only:** `npm pack` runs each package's *own*
`prepack`/`prepare` script (for example it rebuilds `packages/mdk-skill/dist/`),
and the smoke step then installs the tarballs into a temp directory outside the
repo and imports every package entry point and runs every `bin`. That executes
the packages' code, so only run `--smoke` on a checkout you trust.

## 1. Inventory

From the repo root:

```bash
git ls-files '*package.json' | grep -Ev '(^|/)(node_modules|dist|templates|fixtures?)/' \
  | xargs grep -L '"private": true'
```

The filter drops scaffolding templates and generated output, which are not
packages. The scan script applies the same filter.

Cross-check against the table in `NPM_PACKAGES.md` (if present). A package that
is publishable but missing from the doc, or vice versa, is itself a finding.

## 2. Mechanical scan (all packages, one command)

```bash
SCAN_DIR="$(mktemp -d)"   # private dir; never a fixed /tmp path
node <this-skill>/scripts/scan-packages.mjs --audit --smoke --registry --out "$SCAN_DIR/mdk-scan.md"
node <this-skill>/scripts/scan-packages.mjs --audit --smoke --registry --json --out "$SCAN_DIR/mdk-scan.json"
# one package: --pkg backend/core/gateway   (repeatable)
# keep the smoke project for `npm ls <dep>`: --keep-smoke
```

`--out` refuses to overwrite an existing file or follow a symlink. `--audit`,
`--smoke` and `--registry` need network; without them the scan is offline. It runs `npm pack --dry-run --ignore-scripts` per package and checks,
on exactly the files that would ship. "Blocker" refers to the section of that
name in `NPM_PACKAGES.md`:

| Check | Source | What fails |
| --- | --- | --- |
| `files-allowlist` | Blocker "no `files` allowlist" / checklist "Tarball contents" | No `files` field |
| `tarball-contents` | Checklist "Tarball contents" | tests, mocks, fixtures, db/, `.env`, keys, real `config/*.json`, `.sh` in the tarball |
| `escaping-import` | Blocker "relative `require()`s" | Literal `require('../..')` that resolves outside the package dir |
| `undeclared-dep` | Blocker "missing dependency declarations" / "Tarball smoke test" | Bare import not in `dependencies` (dev-only counts as missing) |
| `dep-source` | Checklist "Versions and lockfile" | `file:`/`workspace:`/`link:`/git deps in a published manifest |
| `loose-range` | Checklist "Version ranges" | `*`, `latest`, `x` or unbounded `>=` in `dependencies` (high for the package's own scope) |
| `private-dep` | Checklist "Version ranges" | Depends on a package that is `"private": true` in this repo |
| `dev-peer` | Checklist "Version ranges" / UI class U10 | A dev tool (`vitest`, `jest`, `@testing-library/*`, `vite`, `typescript`, …) is a required `peerDependency`, so npm 7+ installs it for every consumer |
| `root-override` / `package-overrides` | Checklist "Consumer-view audit" | A dep the root `overrides` patches, or `overrides` in the package itself — neither reaches consumers |
| `publish-access` | Blocker "scoped packages publish as restricted" | Scoped package without `publishConfig.access` |
| `repository` | Blocker "missing `repository` metadata" / provenance | No `repository` |
| `prepack-build` | Blocker "no pre-publish build" | `main`/`bin` points at missing build output with no `prepack` |
| `entry-missing` | Checklist "Tarball smoke test" | A `main`, `exports` or `bin` target is not in the tarball |
| `bin-shebang` | Checklist "Tarball smoke test" | A `bin` file without a `#!` line |
| `exports-map` | Hygiene (low) | No `exports` map, so every shipped file is importable |
| `install-scripts` | Checklist "Install scripts" | `preinstall`/`install`/`postinstall` |
| `secrets` | Checklist "Secrets" | Key/token patterns, hard-coded credentials, private IPs, internal hosts |
| `npm-audit` | Checklist "Dependency audit" (`--audit`) | Moderate+ advisories in prod deps of that workspace |
| `smoke-pack` / `smoke-install` / `smoke-import` / `smoke-bin` | Checklist "Tarball smoke test" (`--smoke`) | Packs every package, installs all tarballs together in a temp project outside the repo, imports each `main`/`exports` entry and runs each `bin --help`. Catches runtime-built paths the static `escaping-import` check misses. A load-time throw that is not a missing module is reported low — confirm it is intentional |
| Consumer-view audit | Checklist "Consumer-view audit" (`--smoke`) | `npm audit --omit=dev` in the smoke project; repo-level line naming the vulnerable packages. The workspace audit can be clean while this is not |
| `registry-unclaimed` / `registry-version` / `registry-owner` | Release checks (`--registry`) | Name not on npm yet; version already published; published name points at a different repository (squat). Also reports `npm whoami` and how many packages the scope already holds |
| SAST leads | Checklist "Static analysis" | Grep hits per vulnerability class in shipped runtime code, including the UI classes (`xss` HTML sinks, `url` navigation sinks and `_blank` without `noopener`, `browser-storage`, `postmessage`) — **triage, do not report raw** |

Then run the repo-wide checks the script does not cover, and record the outcome
(including "tool not installed" — never silently skip):

```bash
npm audit --audit-level=moderate                        # root, all workspaces
npm audit signatures                                    # registry signatures of installed deps
npx --yes audit-ci@7.1.0 --config .github/scripts/audit-ci.jsonc                 # downloads; needs network
npx --yes license-checker@25.0.1 --production --onlyAllow 'Apache-2.0;MIT;ISC;BSD-2-Clause;BSD-3-Clause;0BSD;BlueOak-1.0.0;CC0-1.0;Python-2.0;Unlicense' --excludePrivatePackages   # downloads; needs network
gitleaks detect --no-banner                             # if installed; also on each extracted tarball
semgrep --config p/javascript --config p/nodejs <pkg>   # if installed
grep -rn 'uses:' .github/workflows | grep -v '@[0-9a-f]\{40\}'   # actions not pinned to a SHA
git diff <lastTag> -- '**/package.json'                 # new dependencies since last release
npm view <dep> time.modified deprecated                 # per new dep: age (<7 days is a flag) and deprecation
npm sbom --omit dev --sbom-format cyclonedx -w <name>   # attach one SBOM per package to the report
```

`audit-ci` and `license-checker` are not repo dependencies, so `npx` downloads
and runs them. Keep the exact versions above (bump only to a release that is at
least two weeks old, checked with `npm view <pkg> time --json`), never drop the
`@version`, and record "not run (no network)" when offline.

Scope and account checks need `npm login` as a publisher. Record "not run" if
nobody with publish rights is available; never infer ownership from 404s:

```bash
npm whoami
npm org ls <scope-without-@>                 # you are a member with publish rights
npm profile get                              # "two-factor auth" is auth-and-writes
npm access get status <name>                 # after first publish: public as intended
```

If `--registry` shows the scope has no packages and cannot be listed, the scope
may be unclaimed. Anyone can then register it, and every doc that says
`npm install @scope/...` installs their code. Report it as **High** until the
org exists.

`npm` may be a shell alias/function in the user's profile; scripts call the
binary directly, so do the same (`command npm …`) when results differ.

## 3. Manual review (per package, 18 classes + UI classes for browser packages)

Mechanical checks cannot find auth bypasses or SSRF. For each package:

1. Read its `package.json`, README and entry point; list its boundaries using the
   table in [`references/vuln-classes.md`](./references/vuln-classes.md).
2. Enumerate every route, RPC handler, action, MCP tool and exported function
   that accepts external data. Follow each to its sinks (fs, process, network,
   storage, logs, responses).
3. Walk all 18 classes, and for browser packages (`ui/packages/*`) also the UI
   classes U1–U12 in the same reference. Treat device, pool and LLM strings rendered
   by the UI as attacker-controlled. Use the package's SAST leads from step 2 as starting
   points, and read the surrounding code before deciding.
4. Run the package-specific extras from `PUBLISH_CHECKLIST.md` → "Extra checks
   by package" (e.g. gateway: every route requires auth, body/rate limits, CORS,
   plugin resolution confined to allowed roots; workers: Modbus write allowlist,
   no shell interpolation of miner commands, TLS to pools; mcp: `safety` flags).
5. For each class record pass / issue / n/a. An issue needs `file:line`, who the
   attacker is, what they gain, and the fix.

With many packages, fan this out: one subagent per package (or per small group of
similar workers) with the package path, its scan section, and
`references/vuln-classes.md`. Have each return structured findings; verify every
Critical/High yourself by reading the cited lines before it goes in the report.

**Do not** report: grep leads you have not read, issues only reachable from
tests/mocks that do not ship (report the *shipping* of them instead), or style
nits. **Do** report false-negative risk: code the review could not cover (e.g. a
package whose source is not in the tarball, like a TS `dist/`).

## 4. Report

Write `PUBLISH_SECURITY_REPORT.md` at the repo root (or where the user asks):

1. **Header** — date, branch, commit, version, tools run and their versions, tools
   unavailable.
2. **Summary table** — one row per package: blockers / high / medium / low,
   verdict (*Ready* / *Fix before publish* / *Blocked*).
3. **Repo-wide results** — audit, signatures, audit-ci, licences, secrets,
   workflow pinning, SAST availability.
   Include the smoke install result, the consumer-view audit, and the registry
   and scope results.
4. **Per package** — a checklist of every step executed with its result (✅ / ❌ /
   ⚠️ / n/a), then "Issues to fix before publishing" ordered by severity, each with
   `file:line`, impact, and fix.
5. **Cross-cutting fixes** — the same issue in many packages, stated once.

Keep the issue list to things that must change. Link the checklist and
`NPM_PACKAGES.md` instead of repeating them.
