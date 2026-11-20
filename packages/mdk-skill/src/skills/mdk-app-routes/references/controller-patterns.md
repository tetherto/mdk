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
// One unreachable device is skipped; a Kernel refusal fails the request.
const skipDeviceErrors = (err) => {
  if (err && /^ERR_KERNEL_/.test(err.code || '')) throw err
  return null
}

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
    const caps = await mdkClient.getCapabilities(deviceId).catch(skipDeviceErrors)
    if (!isTargetFamily(caps)) continue

    const tel = await mdkClient.pullTelemetry(deviceId, 'metrics').catch(skipDeviceErrors)
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

- Catch per device so one offline device does not fail the route, and rethrow a Kernel refusal: it arrives as a
  rejected call like any device error, so swallowing it answers an empty `200` when the app's own grant never covered
  the call. Let it through and `ERR_KERNEL_ACTION_FORBIDDEN`
  [reaches the caller as `403`](../../../../../../backend/core/gateway/docs/http-api.md#errors-on-every-app-route).
- These calls go through `config.mdkClient`, so the Kernel checks the app's grant and nothing else. A user the
  `spec.rbac` route rule lets in gets whatever the app can read. Call `req.mdk` instead when the operator's own device
  access should gate the data: it carries their token beside the app's, and the Kernel then needs both to allow it.
- Skip non-finite numbers instead of throwing.
- Empty `rows` is a valid 200 — the UI shows an empty state.

## Pattern: read the fleet in one call

Workers whose contract declares `telemetryPollIntervalMs` poll their own devices and store the series. A fleet route
reads those stores through the Kernel in one call and never starts a polling loop of its own:

```js
const CHANNEL = '<channel-1>' // name from the contract, e.g. hashrate_rt

module.exports = async function example (req) {
  const workersResp = await mdkClient.listWorkers()
  const workers = ((workersResp && workersResp.workers) || [])
    .filter((w) => w.state !== 'TERMINATED' && w.healthState !== 'DEAD')
  const workerIds = workers.map((w) => w.workerId)

  // One Kernel call: the latest stored reading per device, no device round-trip.
  const snap = workerIds.length ? await mdkClient.pullSnapshot({ workers: workerIds, metrics: [CHANNEL] }) : { devices: {} }

  const rows = []
  let total = 0
  for (const [deviceId, device] of Object.entries(snap.devices || {})) {
    const reading = device.metrics && device.metrics[CHANNEL]
    const value = Number(reading && reading.value) // `{ error }` when the handler failed at that sweep
    if (!Number.isFinite(value)) continue
    rows.push({ deviceId, value, ts: device.ts })
    total += value
  }

  // A Worker that does not poll is reported under `errors`; read it live.
  for (const [workerId, error] of Object.entries(snap.errors || {})) {
    if (!String(error).startsWith('ERR_TELEMETRY_STORE_DISABLED')) continue
    const worker = workers.find((w) => w.workerId === workerId)
    for (const deviceId of (worker && worker.deviceIds) || []) {
      const tel = await mdkClient.pullTelemetry(deviceId, 'metrics').catch(() => null)
      const value = Number(tel && tel.metrics && tel.metrics[CHANNEL])
      if (!Number.isFinite(value)) continue
      rows.push({ deviceId, value, ts: tel.timestamp })
      total += value
    }
  }

  return { unit: '<unit-from-contract>', total, devices: rows, snapshotTs: snap.snapshotTs }
}
```

When the route only needs the number, let the Workers compute it:

```js
const agg = await mdkClient.pullAggregate({
  workers: workerIds,
  ops: {
    total: { op: 'sum', src: 'metrics.<channel-1>' },
    mean: { op: 'avg', src: 'metrics.<channel-1>' },
    byContainer: { op: 'group_sum', src: 'metrics.<channel-1>', group: 'info.container' }
  }
})
// agg.ops.total, agg.ops.mean, agg.ops.byContainer, agg.deviceCount, agg.errors
```

`src` and `group` are `metrics.<channel>`, `deviceId` or `info.<label>` (the labels the operator gave the device in
`mdk.yaml` under `config.devices[].info`). An op the metric's declared type cannot support (`avg` on a string) is
refused with `ERR_AGGREGATE_OP_TYPE`.

Both reads need `devices: read` on every device of the listed Workers, beside `workers: list` (`mdk-app.yaml`
`permissions`).

### Why no capability fingerprint?

`pullSnapshot` answers only the metrics you name, per device, so a device that does not declare the channel simply
has no reading. When a route must restrict itself to one device family, filter `listWorkers()` rows by
`deviceFamily` or `brand` (the Worker contract's `metadata`, `null` until the Worker has been `READY` once) before
building `workerIds`. Do not read a Worker's store-backed data (`list`, `stats`, `stat-*` logs) through one device to
stand for the Worker; a device-addressed read is authorized on that device alone and answers for that device.

### Reading shape

`pullSnapshot` returns `{ devices: { [deviceId]: { ts, metrics: { [channel]: { value } | { error } } } }, snapshotTs, errors? }`.
A metric whose handler failed at that sweep is its `{ error }` marker, so a gap is distinguishable from a value.
`pullTelemetry(deviceId, 'metrics')` returns `{ metrics: { [channel]: value } }`, read live from the device.

### Resilience

- Skip non-finite numbers instead of throwing.
- `.catch(() => null)` per device on the live fallback so one offline device does not fail the route.
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

A thrown error reaches the HTTP caller with the
[status and message the app runtime gives it](../../../../../../backend/core/app-runtime/README.md#errors-an-http-caller-receives).
Start the message with an `ERR_*` code when the caller should read it, and set `statusCode` on an `ERR_*` error that isn't the
caller's fault: `ERR_MDK_CLIENT_UNAVAILABLE` carries no status, so it reaches the caller as `400` unless you set `503`.
