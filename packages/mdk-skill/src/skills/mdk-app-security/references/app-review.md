# Vendor App review areas (A1–A14)

The manual half of `mdk-app-security`. An MDK App is an npm package with:

- `mdk-app.yaml`: `id`, `version`, `displayName`, and `permissions`, the
  Kernel access its service account `app:<name>` gets in `spec.rbac`
- `mdk-plugin.json` (package root or `plugin/`): the route table. Each route has
  `id`, `handler` (relative to the plugin dir, confined to it by the loader),
  `http.method`/`http.path`, `http.parameters`, optional `requestBody`, `auth`,
  `safety`, `verb`, `resourceName`, `cache`, `stream`
- controllers that get the Kernel client from
  `require('@tetherto/mdk-gateway/plugin').config.mdkClient`, the runtime's
  client signed in as the app
- optionally a UI module rendered in the operator's MDK shell

The Gateway mounts routes under `/apps/<name>` (or `mount`), applies its Host
check and rate limit, then forwards to the app runtime over HRPC.

## Two Gateway auth modes

Review every route under **both**. A vendor app cannot choose which one the
site runs.

| Mode | What protects a route |
| --- | --- |
| **Authority** (`opts.authority`) | Every route needs a bearer token **and** a `spec.rbac` rule for `<app>/<path segments>` with the route's verb (from `verb`, else the HTTP method). `auth` is ignored. `resourceName` names the instance (`{ param \| query \| body: "<field>" }`) so rules can scope per device |
| **Legacy `authVerifier`** | Only routes with `auth: true` run the verifier. **Every other route is open** to anyone who reaches the Gateway |

The app's own Kernel calls are separately bounded by its service-account role,
except `sendWorkerCommand` / `pullWorkerTelemetry`, which dial the Worker
directly.

## Who can reach an app

| Boundary | Attacker | Controls |
| --- | --- | --- |
| Gateway → route | Network peer (legacy mode, `auth` not true); any authenticated user whose role allows the route | Query, path params, body, headers within Gateway limits |
| Kernel/worker data → app | A compromised worker or device; a malicious third-party worker on the same site | Telemetry values, device ids, names, capability lists, error text |
| App → UI | The app's own responses, carrying device strings | What the operator's browser renders |
| App → network | The vendor, via code that calls out | Fleet data leaving the site |
| Vendor → site | The vendor or whoever controls its repo/npm | All code, install scripts, `permissions` it asks for |

## Review areas

Record **pass / issue / n/a** for each, with `file:line` for issues.

**A1. Route authentication.** For each route: is it `auth: true`? If not, is it
acceptable for anyone on the Gateway's network to call it under legacy mode? A
fleet summary is site-sensitive data (hashrate, power, device ids): it should be
`auth: true` unless the vendor documents why not. Any route that writes must be
`auth: true`.

**A2. Route authorization and labelling.** Does `safety` match the handler
(`read-only` routes must reach no write method)? Is `verb` set where the HTTP
method does not say it (a POST that only reads)? Does a device-commanding route
set `resourceName` so an operator's rule can be scoped to `miner/antminer/*`?
Do state changes use GET (prefetch and link-preview hazard), or sit behind
`cache`?

**A3. Permissions (least privilege).** Compare `mdk-app.yaml` `permissions` with
the derived rules (`derive-permissions --check --strict`). No wildcards. No
`policy`, `identities` or `workers: delete` unless the app's purpose is
administration and the README says so. `devices: write` only with a route that
commands devices, and scoped by `resourceNames` when the app serves one family.
Note what the grant means: `devices: read` lets the app read **every**
telemetry channel of every device, including any raw `snap` dumps workers expose.

**A4. Confused deputy.** The app acts with its own role, not the caller's. Can
a low-privilege caller (or an anonymous one, in legacy mode) make the app do
something the caller could not do directly: command a device the caller has no
write on, or read a device outside the caller's scope? Where the app should act
as the caller, does it use `withActor`?

**A5. Direct Worker calls.** `sendWorkerCommand` / `pullWorkerTelemetry` bypass
`spec.rbac` entirely. They need a strong reason, and the route that reaches them
must be `auth: true` with a narrow verb.

**A6. Input validation.** For every input the code reads (the scan's "Request
inputs read" column): is it declared in `http.parameters` / `requestBody` with
type, bounds and `enum`/`pattern`/`maxLength`? Is it re-checked in code (NaN,
negatives, huge numbers, arrays where a string is expected, `__proto__` keys)?
Ids passed to the Kernel (`deviceId`, `workerId`) should be matched against the
discovered set, as `mdk-app-demo`'s history route does, not forwarded blindly.

**A7. Resource use (DoS).** Per-request fan-out (`listWorkers` → `getCapabilities`
→ `pullTelemetry` per device) multiplies one HTTP request into hundreds of Kernel
and device calls. A fleet read belongs in one `pullSnapshot` / `pullAggregate`
call, answered from the Workers' stores with no device round-trip; a per-device
`pullTelemetry` loop is for Workers that do not poll. Expect a `cache` on
fan-out routes, bounded `limit`s, concurrency limits, and timeouts. Streams
(`stream: true`) must end on client disconnect.

**A8. Error and data exposure.** Errors are rethrown to the Gateway's error
handler: do they carry Kernel internals, worker keys, device addresses or
credentials? Do responses include fields the UI does not need (raw telemetry
dumps, device `opts`)? Are device-supplied strings returned unmodified? That is
fine, as long as A12 holds.

**A9. Outbound network and egress.** Any `fetch`/HTTP call: to where, with which
data? Fleet telemetry sent to a vendor endpoint is a data-sharing decision for
the site, not something an app does silently. A URL taken from a request or
from device data is SSRF from the app runtime.

**A10. Runtime safety.** No `child_process`, `eval`, computed `require`, own
listeners (they bypass the Gateway's Host check, auth and rate limit),
`process.exit`, global monkey-patching. The app must use the runtime's
`config.mdkClient`. A client it builds itself does not run as `app:<name>`, so
the app's `spec.rbac` role does not bound it.

**A11. Secrets and logging.** No hard-coded tokens or keys. No logging of
`req` objects, `Authorization` headers, identities or actors. Config read from
env should be documented.

**A12. UI module.** Device, pool, worker and alert strings are
attacker-controlled. Check that there is no `dangerouslySetInnerHTML`/`innerHTML`,
and no `href`/`src` built from data (`javascript:` URLs). The session token must
come from the shell, never read from the URL or stored in `localStorage` by the
app. No scripts, styles or fonts from CDNs (or SRI where unavoidable). No
`postMessage` handlers without an origin check, and no `target="_blank"` without
`rel="noopener"`.

**A13. Supply chain.** Install scripts (`prepare` runs on git installs).
Dependencies exact and few; `@tetherto/*` versions matching the site's MDK
release. `overrides` the site never gets (an advisory the vendor patched in
their repo is live on the site). `files` allowlist. No source maps, minified or
obfuscated code without source.

**A14. Provenance and pinning.** The site pins a full commit SHA or an exact
version. The lockfile agrees. You reviewed that commit. The README does not tell
operators to install `#main`. `repository`, `license` and a security contact are
present. `mdk-app.yaml` `id` is reverse-DNS under the vendor's own domain.

## Mapping to the scanner

| Scanner check | Area |
| --- | --- |
| `route-auth` | A1 |
| `route-safety`, `route-method`, `route-cache`, `route-scope` | A2 |
| `permissions`, `route-admin` | A3 |
| `route-direct` | A5 |
| `route-input`, `input` leads | A6 |
| `route-dos` | A7 |
| `error-leak` leads | A8 |
| `external-host`, `network` leads | A9 |
| `command-exec`, `dynamic-require`, `listener`, `process-control`, `global-mutation`, `kernel-client`, `tls` | A10 |
| `secrets`, `secret-leak` leads | A11 |
| `ui-cdn`, `xss`/`url`/`browser-storage`/`token`/`postmessage` leads | A12 |
| `install-scripts`, `dep-*`, `package-overrides`, `files-allowlist`, `tarball-contents`, `obfuscation`, `undeclared-dep` | A13 |
| `consumer-pin`, `consumer-lock`, `docs-pin`, `repository`, `license` | A14 |
