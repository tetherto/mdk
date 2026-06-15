# @tetherto/miner-antminer

MDK worker for Bitmain Antminer Bitcoin miners. Supports the S19XP family.

## Supported Models

| Export | Model |
|--------|-------|
| `AM_S19XP` | Antminer S19 XP |

## Install

```bash
npm install @tetherto/miner-antminer
```

## Usage

```js
const { AM_S19XP } = require('@tetherto/miner-antminer')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(AM_S19XP, { ork, rack: 'rack-2' })

await manager.registerThing({
  info: {
    serialNum: 'S19XP-001',
    container: 'container-B',
    pos: 'B1'
  },
  opts: {
    address: '192.168.1.20',
    port: 4028             // Antminer CGMiner API port
  }
})
```

## Protocol

Antminer uses the **CGMiner API** over HTTP on port 4028. The worker uses **Digest authentication** (`digest-fetch`) for authenticated requests to the device.

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
| `setPowerMode` | `mode: string` | Change performance mode |
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
| `downloadLogs` | — | Fetch hardware logs |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Alerts:** `alert.overheat`, `alert.fan_failure`, `alert.hashrate_low`

## Development with Mock Server

```js
const amMock = require('@tetherto/miner-antminer/mock/server')

amMock.createServer({
  port: 4028,
  host: '127.0.0.1',
  type: 's19xp'
})
```

## Testing

```bash
cd backend/workers/miners/antminer
npm test
```
