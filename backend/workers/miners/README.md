# workers/miners

Bitcoin ASIC miner workers. Each implements the `MinerManager` base class which extends `ThingManager` with mining-specific services (hashrate tracking, pool management, power mode control, efficiency metrics).

## Packages

| Directory | Package | Models |
|-----------|---------|--------|
| [`base/`](./base/) | `@tetherto/tpl-lib-miner` | `MinerManager` — base class for all miner workers |
| [`whatsminer/`](./whatsminer/README.md) | `@tetherto/miner-whatsminer` | M30SP, M30SPP, M53S, M56S, M63 |
| [`antminer/`](./antminer/README.md) | `@tetherto/miner-antminer` | S19XP and variants |
| [`avalon/`](./avalon/README.md) | `@tetherto/miner-avalon` | A1346 and variants |

## Inheritance Chain

```
ThingManager (workers/base/)
  └── MinerManager (miners/base/)
        ├── WhatsminerManager (miners/whatsminer/)
        │     ├── WM_M30SP
        │     ├── WM_M30SPP
        │     ├── WM_M53S
        │     ├── WM_M56S
        │     └── WM_M63
        ├── AntminerManager (miners/antminer/)
        │     └── AM_S19XP
        └── AvalonManager (miners/avalon/)
              └── AV_A1346
```

## Common Telemetry Fields

All miner workers report these standard telemetry fields:

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

All miner workers support these commands (declared in `mdk-contract.json`):

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
| `saveSettings` | — | Persist worker settings |
| `saveComment` | `text` | Add a device annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |
| `rackReboot` | — | Restart the worker process |
| `downloadLogs` | — | Download raw diagnostic logs |

## Health States

All miner contracts declare: `OK`, `DEGRADED`, `OFFLINE`

Common alerts: `alert.overheat`, `alert.fan_failure`, `alert.psu_failure`, `alert.hashrate_low`

## Quick Start

```js
const { getOrk, startWorker } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')

const ork = await getOrk()
const { manager } = await startWorker(WM_M56S, { ork, rack: 'rack-1' })

await manager.registerThing({
  info: { serialNum: 'WM-001', container: 'A', pos: 'A1' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})
```
