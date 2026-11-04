# Workers/miners

Bitcoin ASIC miner Workers. Each ships a Worker Plugin (`plugin/{index.js,mdk-contract.json,boot.js}`) hosted on
[`WorkerRuntime`][mdk-worker-runtime], with mining-specific config (alert thresholds, stats specs) layered on top via
[`createWorkerInfra`][worker-infra] — see [Worker Runtime store services][worker-runtime-store] for how that shared
plumbing works.

## Packages

| Directory | Package | Models |
|-----------|---------|--------|
| [`avalon/`](./avalon/README.md) | `@tetherto/mdk-worker-avalon` | A1346 and variants |

Antminer and Whatsminer are partner-maintained, not shipped here — see [Run an Antminer Worker][run-antminer-worker]
and [Run a Whatsminer Worker][run-whatsminer-worker] for how they're hosted.

## Package shape

Every package here follows the same layout, each `boot.js` calling `createWorkerInfra()` then constructing
`WorkerRuntime` the same way:

```text
miners/<vendor>/
  plugin/
    index.js        # the Worker Plugin: { contract, dir, connect, disconnect }
    mdk-contract.json
    boot.js          # start<Vendor>Worker(opts) — infra + WorkerRuntime, exported from the package root
    src/
      telemetry/*.js
      commands/*.js
  lib/                 # the vendor device driver `plugin.connect()` returns
  mock/                # a standalone mock of the vendor's native API
```

## Common telemetry fields

All miner Workers report these standard telemetry fields:

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate_rt` | TH/s | Real-time hashrate |
| `hashrate_avg` | TH/s | Average hashrate |
| `power` | W | Current power draw |
| `temperature` | °C | Chip temperature |
| `fan_speed_in` | RPM | Inlet fan speed |
| `fan_speed_out` | RPM | Outlet fan speed |
| `status` | — | Device status string |
| `uptime` | s | Seconds since last boot |
| `accepted_shares` | — | Total accepted shares |
| `rejected_shares` | — | Total rejected shares |
| `pool_url` | — | Active pool URL |
| `efficiency` | W/TH | Power efficiency |
| `power_mode` | — | Current power mode |

## Common commands

All miner Workers support these commands (declared in `mdk-contract.json`):

| Command | Parameters | Description |
|---------|-----------|-------------|
| `reboot` | — | Restart the miner (2–3 min downtime) |
| `setPowerMode` | `mode: string` | Change power/performance mode |
| `setLED` | `enabled: boolean` | Toggle physical LED indicator |
| `setupPools` | `pools: object` | Configure mining pool URLs |
| `setPowerPct` | `pct: number (0–100)` | Set power draw percentage |
| `registerThing` | `info, opts` | Register a new device |
| `updateThing` | `info, opts` | Update device connection info |
| `forgetThings` | `ids` | Remove devices |
| `saveSettings` | — | Persist Worker settings |
| `saveComment` | `text` | Add a device annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |
| `downloadLogs` | — | Download raw diagnostic logs |

## Health states

All miner contracts declare: `OK`, `DEGRADED`, `OFFLINE`

Common alerts: `alert.overheat`, `alert.fan_failure`, `alert.psu_failure`, `alert.hashrate_low`

## Quickstart

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()

const worker = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './store/avalon-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { serialNum: 'AV-001', container: 'A', pos: 'A1' },
    opts: { address: '192.168.1.10', port: 4028, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

Each package's own `USAGE.md` (e.g. [avalon][avalon-usage])
documents its `model` values, mock, and the `registerThing` command for adding a device to an already-running Worker.

## Links

[mdk-worker-runtime]: ../../core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: mdk-worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[worker-infra]: ../../core/mdk/lib/worker-infra.js
<!-- docs@tether.io: worker-infra → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/lib/worker-infra.js -->

[worker-runtime-store]: ../../core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-runtime-store → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->

[run-whatsminer-worker]: ../../../docs/guides/miners/run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer-worker → https://github.com/tetherto/mdk/blob/main/docs/guides/miners/run-whatsminer-worker.md -->

[run-antminer-worker]: ../../../docs/guides/miners/run-antminer-worker.md
<!-- docs@tether.io: run-antminer-worker → https://github.com/tetherto/mdk/blob/main/docs/guides/miners/run-antminer-worker.md -->

[avalon-usage]: ./avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->
