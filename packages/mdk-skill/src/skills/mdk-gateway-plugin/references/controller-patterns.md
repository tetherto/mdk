# Controller patterns

Take the client once per app, in a `lib/client.js` every controller requires. The
`plugin/lib/client.js` that `mdk create app` scaffolds is this exact pattern:

```js
const { config } = require('@tetherto/mdk-gateway/plugin')
module.exports = config.mdkClient
```

`config.mdkClient` is the app runtime's Kernel client. It signs in as the app's service account (`app:<name>`), so the
app may do exactly what `spec.rbac` grants that account: `mdk add app` writes a role granting the `permissions` in
`mdk-app.yaml`. A call the policy does not allow throws `ERR_KERNEL_ACTION_FORBIDDEN`; let it fail the request rather
than treating it as empty data.

Controllers are plain async functions that require it:

```js
const mdkClient = require('../lib/client')

module.exports = async function routeName (req) {
  // ...
  return payload
}
```

`mdkClient` is `@tetherto/mdk-client`. Methods return **bare payloads** — never `.payload`. It connects on first use and
memoizes the connection; a failure maps to `ERR_MDK_CLIENT_UNAVAILABLE` and resets so the next call retries — no `null`
check needed, just a `try`/`catch` around the call if you want to remap the error.

## Pattern: fan-out telemetry for a device family

```js
const isTargetFamily = (capsPayload) => {
  const telemetry =
    (capsPayload && capsPayload.capabilities && capsPayload.capabilities.telemetry) ||
    (capsPayload && capsPayload.telemetry) ||
    []
  const names = new Set(telemetry.map((t) => t && t.name).filter(Boolean))
  // Fingerprint derived from the installed contract — adjust per family
  return names.has('<channel-1>') && names.has('<channel-2>')
}

module.exports = async function example (req) {
  const workersResp = await mdkClient.listWorkers()
  const workers = (workersResp && workersResp.workers) || []
  const deviceIds = workers.flatMap((w) => w.deviceIds || [])

  const rows = []
  let total = 0

  for (const deviceId of deviceIds) {
    const caps = await mdkClient.getCapabilities(deviceId).catch(() => null)
    if (!isTargetFamily(caps)) continue

    const tel = await mdkClient.pullTelemetry(deviceId, 'metrics').catch(() => null)
    const metrics = (tel && tel.metrics) || {}
    const value = Number(metrics['<channel-1>']) // channel name from contract
    if (!Number.isFinite(value)) continue

    rows.push({ deviceId, value })
    total += value
  }

  return { unit: '<unit-from-contract>', total, devices: rows }
}
```

### Why capability fingerprints?

Kernel `getCapabilities` returns the capability list, not full
`mdk-contract.json` metadata (`brand`, `provider`, …). Matching on the
telemetry name set (and optionally command names) is the reliable filter.
Derive the set from the installed contract — do not guess.

### Channel → metrics key

`pullTelemetry(deviceId, 'metrics')` returns `{ metrics: { <channel>: value, ... } }`.
Keys match contract telemetry `name` fields exactly.

### Resilience

- `.catch(() => null)` per device so one offline device does not fail the route.
- Skip non-finite numbers instead of throwing.
- Empty `rows` is a valid 200 — the UI shows an empty state.

## Pattern: single-device read

When the route takes `deviceId` (query/body):

1. Validate `deviceId` is present.
2. Optionally `getCapabilities` to confirm the channel exists.
3. `pullTelemetry` once and return the shaped value.

## Errors

| Error | When |
| --- | --- |
| `ERR_MDK_CLIENT_UNAVAILABLE` | `mdkClient` failed to connect (Kernel unreachable) |
| `ERR_<DOMAIN>_*` | Domain-specific; declare in `mdk-plugin.json` `errors` |
