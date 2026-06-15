# @tetherto/miner-avalon

MDK worker for Canaan Avalon Bitcoin miners. Supports the A1346 family.

## Supported Models

| Export | Model |
|--------|-------|
| `AV_A1346` | Avalon A1346 |

## Install

```bash
npm install @tetherto/miner-avalon
```

## Usage

```js
const { AV_A1346 } = require('@tetherto/miner-avalon')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(AV_A1346, { ork, rack: 'rack-3' })

await manager.registerThing({
  info: { serialNum: 'AV-001', container: 'container-C', pos: 'C1' },
  opts: { address: '192.168.1.30', port: 4028 }
})
```

## Protocol

Avalon uses a native HTTP API on port 4028. The worker uses `@tetherto/svc-facs-tcp` for connection management and supports fan control, clock tuning, and pool reconfiguration through the Avalon API.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate_rt` | TH/s | Real-time hashrate |
| `hashrate_avg` | TH/s | Average hashrate |
| `power` | W | Current power draw |
| `temperature` | °C | Chip temperature |
| `fan_speed_in` | RPM | Inlet fan speed |
| `fan_speed_out` | RPM | Outlet fan speed |
| `status` | — | Device status |
| `uptime` | s | Seconds since last boot |
| `accepted_shares` | — | Total accepted shares |
| `rejected_shares` | — | Total rejected shares |
| `pool_url` | — | Active pool URL |
| `efficiency` | W/TH | Power efficiency |

## Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `reboot` | — | Restart the miner |
| `setPowerMode` | `mode: string` | Change power mode |
| `setLED` | `enabled: boolean` | Toggle LED |
| `setupPools` | `pools: object` | Configure pool URLs |
| `registerThing` | `info, opts` | Register device |
| `updateThing` | `info, opts` | Update device |
| `forgetThings` | `ids` | Remove devices |
| `saveSettings` | — | Persist settings |
| `saveComment` | `text` | Add annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |
| `rackReboot` | — | Restart worker process |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Alerts:** `alert.overheat`, `alert.fan_failure`, `alert.hashrate_low`

## Testing

```bash
cd backend/workers/miners/avalon
npm test
```
