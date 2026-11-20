---
name: mdk-app-security
description: >
  Security-review a third-party (vendor) MDK App before a site adds or upgrades
  it — a package with mdk-app.yaml, mdk-plugin.json routes, controllers and
  optionally a UI, installed with `mdk add app` or as a dependency, such as
  @tetherto/mdk-app-demo. Use when asked to "security
  check / audit / vet / review an MDK app", "is this app safe to add", "review
  the app's routes / permissions", before bumping an app's pinned version, or
  to check an app for open (auth false) routes, read-only routes that command
  devices, excess or wildcard permissions in mdk-app.yaml, direct-to-Worker
  calls that bypass spec.rbac, unvalidated route input, fleet-data egress,
  UI XSS, or supply-chain risk (install scripts, mutable git pins).
argument-hint: "<app-dir> [--consumer <site-dir>]"
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Vendor App security review (`mdk-app-security`)

An MDK App runs in its own app runtime process as the service account
`app:<name>`. The Gateway forwards its routes to it, and it calls the Kernel
with whatever its role in `spec.rbac` allows. Its UI module renders inside the
operator's authenticated shell. The site does not write this code: it installs
it from the vendor (`mdk add app github:<org>/<app>#<ref>`, npm, or `file:`)
and grants it a role from its own `mdk-app.yaml`. This skill produces one
Markdown report saying whether a given app, at a given version, is safe to add,
and what must change first.

It reviews **one app at the version the site installs**. For a vendor device
Worker use `mdk-worker-security`. For MDK's own publishable packages use
`mdk-publish-security`. To fix (not just review) an app's permissions, use
`mdk-app-rbac`.

The skill never edits the app, never installs it and never runs its code or
install scripts. The scan reads files, runs `npm pack --dry-run --ignore-scripts`
and `git rev-parse`, and (when installed alongside) the read-only
`mdk-app-rbac/scripts/derive-permissions.mjs`.

## 1. Get exactly what the site installs

1. Find how the site installs the app: `mdk.yaml` → `spec.apps[].package`, and
   the matching `package.json` dependency (`"@tetherto/mdk-app-demo":
   "0.1.0"`, `github:org/app#<sha>`, or a version).
2. Use the installed copy when there is one (`<site>/node_modules/<app>/`, or
   the `file:` target). Otherwise clone and check out the pinned ref into a fresh
   directory outside the repo, without installing:

   ```bash
   REVIEW_DIR="$(mktemp -d)"
   git clone --no-checkout https://github.com/<org>/<app>.git "$REVIEW_DIR/a"
   git -C "$REVIEW_DIR/a" checkout <pinned-sha>
   ```

3. For an upgrade, diff old against new pin, focusing on `mdk-plugin.json`,
   `mdk-app.yaml`, controllers, `lib/`, `ui*/` and `package.json`.

Never run `npm install`, `npm test` or the app's scripts during the review.

## 2. Mechanical scan

```bash
SCAN_DIR="$(mktemp -d)"
node <this-skill>/scripts/scan-app.mjs <app-dir> --consumer <site-dir> --out "$SCAN_DIR/app-scan.md"
node <this-skill>/scripts/scan-app.mjs <app-dir> --consumer <site-dir> --json --out "$SCAN_DIR/app-scan.json"
```

The report starts with a **route table**: each route's method, path, `auth`,
`safety`, the Kernel client methods its handler can reach (following local
`require`s), and the request inputs the code reads. That table is the map for
step 3.

| Check | What fails |
| --- | --- |
| `route-auth` | `auth` not `true`. With an authority configured the Gateway requires a token and a `spec.rbac` rule on every route, whatever `auth` says. On a Gateway running the older `authVerifier` mode, only `auth: true` routes are checked, so the rest are **open**. High if the route writes, medium for reads |
| `route-safety` | No `safety`, or `read-only` on a route that reaches `sendCommand`/other writes or is not a GET |
| `route-method` / `route-cache` | A GET that changes state; a cached route that changes state |
| `route-direct` | `sendWorkerCommand` / `pullWorkerTelemetry`: dials the Worker directly, outside `spec.rbac` |
| `route-admin` | Reaches `applyRbac`, identity, signing-key or `terminateWorker` calls |
| `route-scope` | A device-commanding route with no `resourceName`, so `spec.rbac` cannot scope it per device |
| `route-input` | Handler reads `req.query.x` / `req.body` with no declared schema; declared strings without `enum`/`maxLength`/`pattern`, numbers without `maximum`, bodies allowing extra properties |
| `route-dos` | Per-request fan-out over every Worker/device with no `cache` |
| `route-handler` / `plugin-manifest` / `app-manifest` | Missing manifests, handlers outside the plugin dir, missing, or not shipped |
| `permissions` | Wildcards; `policy`/`identities` granted. Via `derive-permissions --check --strict`: access the code needs but is not declared, access declared but unused, direct Worker calls |
| `kernel-client` | Plugin builds its own Kernel client instead of using the runtime's `config.mdkClient`, so it does not run as `app:<name>` |
| `external-host` | A non-local URL in plugin or UI code: fleet data leaving the site, or third-party code in the operator session |
| `ui-cdn` | `<script>`/`<link>` from a CDN, worse without SRI |
| `command-exec` / `dynamic-require` / `listener` / `process-control` / `global-mutation` / `tls` / `obfuscation` | As named |
| `install-scripts` / `dep-*` / `package-overrides` / `files-allowlist` / `tarball-contents` / `secrets` / `undeclared-dep` | Supply chain and packaging |
| `consumer-pin` / `consumer-lock` / `docs-pin` | Branch, tag or no ref; lockfile disagrees; scanned commit ≠ pinned commit; README tells sites to install `#main` |

SAST leads (`error-leak`, `input`, `fs`, `network`, `xss`, `url`,
`browser-storage`, `token`, …) are **triage pointers, not findings**.

When `derive-permissions` reports "needs the `yaml` package" for an app checked
out alone, run it from the site instead
(`node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --check --strict`
with the site as working directory), or record it as not run.

Then, as for any package, and recording "not run" for anything skipped:

```bash
AUDIT_DIR="$(mktemp -d)"
cp <app-dir>/package.json "$AUDIT_DIR/"
(cd "$AUDIT_DIR" && command npm install --package-lock-only --ignore-scripts --omit=dev && command npm audit --omit=dev)
gitleaks detect --no-banner --no-git --source <app-dir>      # if installed
semgrep --config p/javascript --config p/nodejs <app-dir>    # if installed
```

## 3. Manual review

Follow [`references/app-review.md`](./references/app-review.md), areas A1–A14:

1. **Per route** (from the route table): who can call it under both Gateway
   modes (authority, and legacy `authVerifier`); what the handler does with each
   input; which Kernel calls it makes and with which ids; what it returns. Confirm
   `safety`, `verb` and `resourceName` match what it does.
2. **Permissions**: compare `mdk-app.yaml` with the scan's derived rules. Least
   privilege: a monitoring app needs `devices: read`, `workers: list`, nothing
   more. Any `write` must map to a route that commands devices; scope it with
   `resourceNames` when the app serves one family.
3. **Data flow out**: everything that leaves the app (responses, logs, outbound
   requests, UI storage). Flag device credentials, Kernel internals and fleet
   data sent off-site.
4. **UI module**, if present: render paths for device, pool and worker strings;
   token handling; external resources.
5. **Confirm each scanner finding** by reading the cited code; drop false
   positives and say why.
6. Record **pass / issue / n/a** per area. An issue needs `file:line`, the
   attacker (unauthenticated network peer, an operator with a low role, a
   compromised worker or device feeding strings, the vendor), impact, and fix.

## 4. Report

Write `APP_SECURITY_REPORT-<app>.md` where the user asks (default: the site
directory). Never commit it unless asked.

1. **Header**: app name, version, `mdk-app.yaml` `id`, repo, reviewed commit, the
   site's pin, date, tools run and versions, tools not run.
2. **Verdict**: *Add* / *Add with conditions* (e.g. "only behind an
   authority", "with the narrowed role below") / *Fix before adding* / *Do not
   add*, and one sentence why.
3. **Route table**: from the scan, with your per-route verdict.
4. **Permissions**: declared, derived, and the role you recommend for
   `spec.rbac`.
5. **Issues to fix**, most severe first: `file:line`, attacker, impact, fix.
   Separate *vendor must fix* from *site can mitigate* (authority mode, a
   narrower role, a pinned commit, no `mount: /`).
6. **Upgrade delta** (upgrades only).

### Severity

| Severity | Meaning | Add? |
| --- | --- | --- |
| **Critical** | Unauthenticated device control, code execution in the app runtime, credential or fleet-data exfiltration, RBAC/identity takeover | No |
| **High** | An open or mislabelled write route, a direct-Worker bypass, wildcard or admin permissions without need, UI XSS from device strings, a mutable pin | Fix first |
| **Medium** | Open read routes (under `authVerifier` mode), unvalidated input with limited reach, excess but non-admin permissions, per-request fan-out DoS, error detail leaks | Fix or accept explicitly |
| **Low** | Hygiene: docs, metadata, shipped tests, missing `safety` | Track |
