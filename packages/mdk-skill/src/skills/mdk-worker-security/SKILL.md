---
name: mdk-worker-security
description: >
  Security-review a third-party (vendor) MDK device Worker before a site
  installs or upgrades it — a Worker Plugin package (mdk-contract.json + src/
  handlers) pulled in as a git or npm dependency, such as whatsminer-mdk-worker,
  antminer-mdk-worker or sealminer-mdk-worker in examples/mvp-site. Use when
  asked to "security check / audit / vet / review a vendor worker", "is this
  worker safe to install", "review the new <vendor>-mdk-worker commit", before
  bumping a worker's pinned commit, or to check a worker for supply-chain risk
  (install scripts, mutable git pins, phone-home hosts, obfuscated code),
  device-credential leaks, unsafe command handlers (firmware, network, pools),
  unbounded device responses or a mock server exposed on the LAN.
argument-hint: "<worker-dir> [--consumer <site-dir>]"
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Vendor Worker security review (`mdk-worker-security`)

A vendor Worker runs inside the site's Worker process with every device's
credentials in `opts`, answers the Kernel's telemetry pulls and executes its
commands against physical hardware. The site does not write this code: it
installs it from the vendor's git repo (`git+https://…#<sha>`) or npm and trusts
it. This skill produces one Markdown report saying whether a given worker, at a
given commit, is safe to install, and what must change first.

It reviews **one worker at the commit the site installs**. For MDK's own
publishable packages use `mdk-publish-security`; for a vendor app use
`mdk-app-security`.

The skill never edits the worker, never installs it and never runs its code,
its install scripts, its mocks or its `scripts/test-live-*`. The scan script
only reads files (plus `npm pack --dry-run --ignore-scripts` and `git rev-parse`).

## 1. Get exactly what the site installs

Review the code that will run, not the vendor's default branch:

1. Read the site's spec for the worker in `package.json` (e.g.
   `"whatsminer-mdk-worker": "git+https://github.com/whatsminer/whatsminer-mdk-worker.git#a47fa82…"`).
2. Use the installed copy when there is one: `<site>/node_modules/<worker>/`.
   Otherwise clone and check out the pinned commit into a fresh directory outside
   the repo, **without** installing it:

   ```bash
   REVIEW_DIR="$(mktemp -d)"
   git clone --no-checkout https://github.com/<vendor>/<worker>.git "$REVIEW_DIR/w"
   git -C "$REVIEW_DIR/w" checkout <pinned-sha>
   ```

3. For an upgrade, also diff the old pin against the new one; review the diff
   with extra care (`git -C "$REVIEW_DIR/w" diff <old-sha> <new-sha> --stat`, then
   the files touched under `src/`, `lib/`, `package.json`, `mdk-contract.json`).

Never run `npm install`, `npm test`, `npm run mock` or any script in the
checkout during the review: `prepare`, `postinstall` and the scripts themselves
are part of what you are reviewing.

## 2. Mechanical scan

```bash
SCAN_DIR="$(mktemp -d)"
node <this-skill>/scripts/scan-worker.mjs <worker-dir> --consumer <site-dir> --out "$SCAN_DIR/worker-scan.md"
node <this-skill>/scripts/scan-worker.mjs <worker-dir> --consumer <site-dir> --json --out "$SCAN_DIR/worker-scan.json"
```

`--consumer` is the directory holding the site's `package.json` (e.g.
`examples/mvp-site`). `--out` refuses an existing path or symlink.

| Check | What fails |
| --- | --- |
| `install-scripts` | `preinstall` / `install` / `postinstall`, or `prepare` (runs on **every git install**), in the worker or a transitive dep (site lockfile `hasInstallScript`) |
| `dep-source` / `dep-range` | Git/URL/`file:` deps, unpinned git deps, `*`/`latest`/`>=` ranges; caret ranges (the worker's lockfile never applies on the site) |
| `package-overrides` / `shrinkwrap` / `bundled-deps` | Fixes the site never gets; a shrinkwrap that overrides the site's tree; bundled third-party code |
| `files-allowlist` / `tarball-contents` / `native-binary` / `symlink` | What `npm pack --dry-run` would install: keys, `.env`, captures, archives, firmware images, `.node`/`.wasm`, symlinks, tests |
| `contract` / `contract-handler` | No contract, unparseable, a handler outside the package, missing, or excluded by `files` |
| `command-param` | Number params without `min`/`max`; free-form string/object/array params (the Kernel checks only the type — the handler is the only validation) |
| `command-docs` | A state-changing command (firmware, network, pools, reboot, power, hostname, …) with no `constraints` |
| `telemetry-exposure` | A telemetry channel whose name suggests raw config or credentials (`snap`, `config`, `debug`, …) |
| `command-exec` / `dynamic-require` / `obfuscation` | `child_process`, `eval`, `new Function`, computed `require`, long encoded literals, minified lines |
| `listener` / `process-control` / `global-mutation` / `tls` | Runtime code that opens a server, exits the process, mutates globals or core modules, or disables TLS checks |
| `external-host` | A URL to a non-local host in runtime code: phone-home, telemetry or update channel |
| `undeclared-dep` | A bare import not in `dependencies` (`@tetherto/mdk-worker` is host-provided) |
| `secrets` | Keys, tokens, credential literals, default device passwords, private IPs |
| `mock-bind` / `mock-exec` | Shipped mock servers that bind all interfaces or execute code (sites start them) |
| `consumer-pin` / `consumer-lock` | Branch/tag/no ref, `http:`/`git:` transport, lockfile resolving another commit, or **you scanned a different commit than the site installs** |
| Notes | Site `overrides` that replace a worker dependency (e.g. mvp-site's `crypto-js` → `lib/mdk-crypto-lib`): review the replacement as part of the worker |

SAST leads (`fs`, `network`, `input`, `crypto`, `secret-leak`, `timers`, …) are
**triage pointers, not findings**. Read the code around each before reporting.

Then run what the script does not:

```bash
command npm view <worker-name> time.modified repository.url maintainers --json   # npm-published workers only
gitleaks detect --no-banner --no-git --source <worker-dir>                        # if installed
semgrep --config p/javascript --config p/nodejs <worker-dir>                      # if installed
```

And audit the worker's dependency tree **without running its scripts**, in a
scratch copy outside the repo:

```bash
AUDIT_DIR="$(mktemp -d)"
cp <worker-dir>/package.json "$AUDIT_DIR/"
(cd "$AUDIT_DIR" && command npm install --package-lock-only --ignore-scripts --omit=dev && command npm audit --omit=dev)
```

Record "not run (tool not installed / no network)" for anything skipped. Never
silently skip.

## 3. Manual review

Work from the contract, not from the grep leads. The checklist, with the
whatsminer-shaped examples of what to look for, is in
[`references/worker-review.md`](./references/worker-review.md). In order:

1. **Map the boundaries.** List every telemetry and command handler from
   `mdk-contract.json`, then follow `src/client.js` (the device connection) and
   `lib/` to every socket, HTTP call, file write and log line.
2. **Walk the review areas W1–W14** in the reference: credentials, telemetry
   exposure, command parameters, firmware, network/pool reconfiguration,
   connection targets (SSRF), device-response parsing, protocol crypto,
   resource bounds, process safety, logging, mocks and scripts, supply chain,
   provenance.
3. **Trace every free-form command param** flagged by `command-param` field by
   field to the device protocol: which fields are forwarded, are they
   type/length/charset/range checked, can one carry a URL, host, credential or
   shell metacharacters into the firmware.
4. **Confirm each scanner finding** by reading the cited line; drop false
   positives and say why in the report.
5. For each area record **pass / issue / n/a**. An issue needs `file:line`, who
   the attacker is (Kernel caller with `devices:write`, a spoofed device or LAN
   MITM, the vendor's update channel, a LAN peer reaching a mock), what they
   gain, and the fix.

With several workers, fan out one subagent per worker, each given the worker
dir, its scan JSON and `references/worker-review.md`; verify every High yourself
before it goes in the report.

**Do not** report: grep leads you have not read; vendor protocol choices the
device firmware mandates (e.g. Whatsminer API v2's MD5-crypt + AES-ECB) as
worker bugs. Report those once as *accepted residual risk* with the
compensating control (isolated mining VLAN, strong per-device passwords).
**Do** report what you could not review (minified code, native binaries,
archives, a dependency fetched from git).

## 4. Report

Write `WORKER_SECURITY_REPORT-<worker>.md` where the user asks (default: the
site directory). Never commit it unless asked.

1. **Header**: worker name, version, repo, reviewed commit, the site's pin, date,
   tools run and their versions, tools not run.
2. **Verdict**: *Install* / *Install with accepted risks* / *Fix before install*
   / *Do not install*, and one sentence why.
3. **Summary table**: high / medium / low counts, plus the W1–W14 results.
4. **Issues to fix**, most severe first: `file:line`, attacker, impact, fix.
   Separate *vendor must fix* from *site can mitigate* (pin, override, network
   isolation, not starting the mock, RBAC on `devices:write`).
5. **Accepted residual risks**: protocol-mandated weaknesses and their controls.
6. **Upgrade delta** (upgrades only): what changed between the old and new pin
   and whether it changes the verdict.

### Severity

| Severity | Meaning | Install? |
| --- | --- | --- |
| **Critical** | Code execution on the worker host, credential exfiltration, a phone-home channel, a backdoor command, an install script fetching code | No |
| **High** | A command param that reaches the device unvalidated with real impact (pool hijack, network takeover, arbitrary firmware), credentials in telemetry/logs/errors, a mutable pin, unreviewable code | Fix first |
| **Medium** | Missing bounds or timeouts (DoS of the worker by one device), unsafe defaults with a safe override, a LAN-exposed mock | Fix or accept explicitly |
| **Low** | Hygiene: docs, metadata, shipped tests, private IPs in fixtures | Track |
