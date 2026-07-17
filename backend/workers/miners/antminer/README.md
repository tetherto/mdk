# @tetherto/mdk-worker-antminer

MDK Worker for Bitmain Antminer Bitcoin miners. Supports S19XP, S19XP Hydro, S21, and S21 Pro.

## Supported Models

| `model` value | Model |
|--------|-------|
| `s19xp` | Antminer S19 XP |
| `s19xp_h` | Antminer S19 XP Hydro |
| `s21` | Antminer S21 |
| `s21pro` | Antminer S21 Pro |

## Install

```bash
npm install @tetherto/mdk-worker-antminer
```

## Usage

```js
const { getKernel } = require('@tetherto/mdk')
const { startAntminerWorker } = require('@tetherto/mdk-worker-antminer')

const kernel = await getKernel()

const worker = await startAntminerWorker({
  workerId: 'antminer-rack-2',
  model: 's19xp',
  storeDir: './store/antminer-rack-2',
  seedDevices: [{
    info: {
      serialNum: 'S19XP-001',
      container: 'container-B',
      pos: 'B1'
    },
    opts: {
      address: '192.168.1.20',
      port: 80,             // Antminer HTTP API port
      username: 'root',
      password: 'root'
    }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — see [USAGE.md](USAGE.md#registering-devices) for the full pattern and the
restart-required caveat.

## Protocol

Antminer uses the **CGMiner-derived HTTP API** with **Digest authentication** for authenticated requests to the device.

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
| `rackReboot` | — | Restart Worker process |
| `downloadLogs` | — | Fetch hardware logs |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Alerts:** `alert.overheat`, `alert.fan_failure`, `alert.hashrate_low`

## Development with Mock Server

Run the mock standalone — the model `type` is the first argument (case-insensitive):

```bash
npm run mock s19xp
```

Programmatic:

```js
const amMock = require('@tetherto/mdk-worker-antminer/mock/server')

amMock.createServer({
  port: 14021,
  host: '127.0.0.1',
  type: 's19xp',
  serial: 'AM-001',
  password: 'root'
})
```

## Testing

```bash
cd backend/workers/miners/antminer
npm test
```
