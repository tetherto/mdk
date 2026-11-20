# Vendor Worker review areas (W1–W14)

The manual half of `mdk-worker-security`. A device Worker Plugin is loaded by
`WorkerRuntimeV2` from its package directory, instantiated once per device, and
answers only Kernel pulls (`telemetry.pull`, `state.pull`, `health.ping`) and
commands (`command.request`). Handlers read device context from
`require('@tetherto/mdk-worker/device')` (`id`, `opts`, `logger`). `opts` is the
site's device entry, e.g. `{ address, port, password, conf }` from
`config/devices.json`.

## Who can reach a worker

| Boundary | Attacker | What they control |
| --- | --- | --- |
| Kernel → command handler | Anyone the site's `spec.rbac` grants `devices:write` (operators, apps, MCP agents driven by an LLM) | Every command param, within the contract's declared type/enum/min/max only |
| Kernel → telemetry handler | Anyone with `devices:read` | Which channel is pulled and how often; params such as `limit` |
| Device → worker (responses) | A compromised or spoofed miner, a MITM on the plain-TCP mining LAN | Every byte the worker parses: size, shape, keys, timing |
| Site config → worker (`opts`, `conf`) | The local operator (trusted), but values are often copied from examples | Address, port, credentials, tuning knobs |
| Vendor → site (install/upgrade) | The vendor, or whoever controls the vendor's repo or npm account | All code, install scripts, dependencies |
| LAN → mock server | Any host on the site network, when a site starts the shipped mock | Mock endpoints (often unauthenticated, sometimes writable) |

## Review areas

Record **pass / issue / n/a** for each, with `file:line` for issues.

**W1. Device credentials.** Where does `opts.password` (and any `username`,
API key or token) go? It must reach only the device protocol. Check that it is
not copied into telemetry results (`snap`, `device-info`), command results, error
messages (`new Error(\`… ${opts}\`)`), `logger`/`debug` calls, or objects built
with `...opts` that are later returned or logged. A worker that ships a default
password (`password || 'admin'`) turns a missing config field into a known
credential. It must fail with `ERR_DEVICE_CONFIG_INVALID` instead, as whatsminer's
`deviceConfig()` does.

**W2. Telemetry exposure.** Every telemetry handler's return value goes to every
caller with `devices:read`, to MCP tool output (LLM context), and to the UI.
Read each one. Raw dumps (`snap`, `miner-stats`, `pools`) must not include pool
passwords, the device's admin password or token, API session keys, or full
network config with credentials. Strings that come from the device (pool URLs,
worker names, hostnames, error text) are attacker-controlled downstream. Note
them for the UI and MCP owners.

**W3. Command parameters.** For each command, compare the contract param
(`type`, `enum`, `min`, `max`) with what the handler forwards. The Kernel
validates only what the contract declares. For `object`/`array`/free `string`
params, the handler is the only check. Look for type, length and charset checks,
rejection of unknown fields, and numeric range. Watch for values interpolated
into the device protocol (CGMiner `command|param` strings, JSON-RPC bodies,
HTTP form/CGI fields): a `,`, `|`, newline or quote in a hostname or worker name
can smuggle a second device command.

**W4. Firmware update.** `updateFirmware` style commands: where does the image
come from (inline base64 payload, URL, path)? Is there a size cap (whatsminer:
`device.conf.maxFirmwareSize`), and is it on by default? Is the image checked
against a vendor signature or a hash the operator supplies before it is sent?
Is the filename sanitised? A URL source is an SSRF and a fetch of unverified
code. A path source is an arbitrary file read on the worker host.

**W5. Network and pool reconfiguration.** `setNetwork`, `setupPools`,
`setHostname`, `reset`/`factoryReset`, `setPassword`. These can redirect hashrate
(pool hijack), move the miner off the management network (lockout), or change
credentials. Check that each field is validated (pool URL scheme `stratum+tcp`/
`stratum+ssl` and host, IP/netmask/gateway/DNS format, hostname charset and
length), that partial objects cannot clear fields, and that the result reports
what the device actually applied.

**W6. Connection targets (SSRF).** The worker should connect only to
`opts.address` on its declared ports. Can any command param or device response
change the host or port the worker dials (redirect following, a URL in a
response that is then fetched, `probe` fallbacks to other ports)? Any
`external-host` finding is a phone-home candidate. A device worker has no reason
to talk to the internet. Identify every such host and why it is there.

**W7. Device-response parsing.** Responses come from a device that may be
compromised. Check that every socket read has a **size cap** and a **timeout**
(`Buffer.concat` / `+= chunk` loops with no limit are memory exhaustion), that
`JSON.parse` is in a try/catch, and that parsed objects are not merged into
prototypes or used as keys unchecked (`__proto__`). Numbers should be checked
with `Number.isFinite` before they reach telemetry. A crash in one device's
parser must not take down the worker.

**W8. Protocol cryptography.** Separate what the firmware mandates from what
the worker chose. Whatsminer API v2 mandates MD5-crypt key derivation and
AES-256-ECB. Report that as accepted residual risk (the LAN must be isolated),
not as a worker bug. The worker's own choices are findings: `Math.random` for
salts, nonces or ids; TLS verification disabled on a link that supports it;
keys or tokens cached on disk; hand-rolled crypto where `node:crypto` exists.
If the site swaps a crypto dependency (mvp-site overrides `crypto-js` with
`lib/mdk-crypto-lib`), review the replacement for mode, padding and key-length
parity with the original.

**W9. Resource bounds and lifecycle.** Connection reuse (one cached
`devicePromise` per device: is it reset on failure, or does one failure poison
it forever?), reconnect back-off (no tight retry loop against a dead miner),
timers cleared on close, no unbounded per-device caches, log download size caps
(`downloadLogs`), concurrency limits on fan-out calls.

**W10. Process safety.** Handlers run in a process shared by every device on
the worker. No `process.exit`, no global `uncaughtException` handler, no
monkey-patching of `net`/`http`/`tls` or `Object.prototype`, no listeners opened
by runtime code, no `child_process`, `eval` or computed `require`.

**W11. Logging.** `logger`/`debug` lines must not print passwords, tokens,
session keys, decrypted payloads or whole config objects. Debug namespaces are
often turned on in production to chase an incident.

**W12. Mocks and scripts.** `mock/` servers and `scripts/test-live-*` ship in
the tarball, and sites start mocks (mvp-site starts `mock/api-v3-server`). A mock
should bind `127.0.0.1` by default, must not execute input, and must not embed
real credentials or vendor lab addresses. `test-live-*` scripts that send real
commands must refuse to run without an explicit target and confirmation.

**W13. Supply chain.** Install scripts (`prepare` runs on every git install).
Runtime dependency count and provenance; deps fetched from git; caret ranges
(the worker's lockfile never applies on the site); `overrides` the site never
gets; obfuscated, minified or encoded code; native binaries. The site's pin must
be a full commit SHA over https, and its lockfile must resolve the same commit.

**W14. Provenance and maintenance.** Is the repo owned by the vendor it claims
(org, `author`, `NOTICE`)? Does `package.json` have `repository` and `license`?
Is there a `SECURITY.md` with a reporting channel? Is the pinned commit on the
default branch, not on an unmerged fork branch? Does the contract declare
`contractVersion` so the Kernel enforces units and bounds?

## Mapping to the scanner

| Scanner check | Area |
| --- | --- |
| `secrets`, `secret-leak` leads | W1, W11 |
| `telemetry-exposure` | W2 |
| `command-param`, `command-docs`, `validation` leads | W3–W5 |
| `external-host`, `network` leads | W6 |
| `input` leads | W7 |
| `crypto` leads, `tls` | W8 |
| `timers` leads, `fs` leads | W9 |
| `process-control`, `global-mutation`, `listener`, `command-exec`, `dynamic-require` | W10 |
| `mock-bind`, `mock-exec`, `script-exec` leads | W12 |
| `install-scripts`, `dep-*`, `package-overrides`, `obfuscation`, `native-binary`, `consumer-*` | W13 |
| `repository`, `license`, `contract-version` | W14 |
