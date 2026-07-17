# workers/miners

Bitcoin ASIC miner Workers. Each ships a Worker Plugin (`plugin/{index.js,mdk-contract.json,boot.js}`) hosted on
[`WorkerRuntime`][mdk-worker-runtime], with mining-specific config (alert thresholds, stats specs) layered on top via
[`createWorkerInfra`][worker-infra] — see [Worker Runtime legacy services][worker-runtime-legacy] for how that shared
plumbing works.

## Packages

| Directory | Package | Models |
|-----------|---------|--------|
| [`whatsminer/`](./whatsminer/README.md) | `@tetherto/mdk-worker-whatsminer` | M30SP, M30SPP, M53S, M56S, M63 |
| [`antminer/`](./antminer/README.md) | `@tetherto/mdk-worker-antminer` | S19XP and variants |
| [`avalon/`](./avalon/README.md) | `@tetherto/mdk-worker-avalon` | A1346 and variants |

## Package shape

Every package here follows the same layout, each `boot.js` calling `createWorkerInfra()` then constructing
`WorkerRuntime` the same way:

```
miners/<vendor>/
  plugin/
    index.js        # the Worker Plugin: { contract, dir, connect, disconnect }
    mdk-contract.json
    boot.js          # start<Vendor>Worker(opts) — infra + WorkerRuntime, exported from the package root
    src/
      telemetry/*.js
      commands/*.js
  lib/                 # the vendor device driver `plugin.connect()` returns
  mock/                # a standalone fake of the vendor's native API
```

## Common Telemetry Fields

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

## Common Commands

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
| `rackReboot` | — | Restart the Worker process |
| `downloadLogs` | — | Download raw diagnostic logs |

## Health States

All miner contracts declare: `OK`, `DEGRADED`, `OFFLINE`

Common alerts: `alert.overheat`, `alert.fan_failure`, `alert.psu_failure`, `alert.hashrate_low`

## Quick Start

```js
const { getKernel } = require('@tetherto/mdk')
const { startWhatsminerWorker } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()

const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  model: 'm56s',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: { serialNum: 'WM-001', container: 'A', pos: 'A1' },
    opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

Each package's own `USAGE.md` ([whatsminer][whatsminer-usage], [antminer][antminer-usage], [avalon][avalon-usage])
documents its `model` values, mock, and the `registerThing` command for adding a device to an already-running Worker.

## Links

[mdk-worker-runtime]: ../../core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: mdk-worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[worker-infra]: ../../core/mdk/lib/worker-infra.js
<!-- docs@tether.io: worker-infra → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/lib/worker-infra.js -->

[worker-runtime-legacy]: ../../../docs/reference/maintainers/worker-runtime-legacy-services.md
<!-- docs@tether.io: worker-runtime-legacy → https://github.com/tetherto/mdk/blob/main/docs/reference/maintainers/worker-runtime-legacy-services.md -->

[whatsminer-usage]: ./whatsminer/USAGE.md
<!-- docs@tether.io: whatsminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/USAGE.md -->

[antminer-usage]: ./antminer/USAGE.md
<!-- docs@tether.io: antminer-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md -->

[avalon-usage]: ./avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->
