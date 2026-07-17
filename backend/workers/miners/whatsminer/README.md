# @tetherto/mdk-worker-whatsminer

MDK Worker for MicroBT Whatsminer Bitcoin miners. Supports the M30SP, M30SPP, M53S, M56S, and M63 model families.

## Supported Models

| `model` value | Model | Notes |
|--------|-------|-------|
| `m30sp` | M30S+ | — |
| `m30spp` | M30S++ | — |
| `m53s` | M53S | — |
| `m56s` | M56S | Used in examples |
| `m63` | M63 | Extra `setUpfreqSpeed` command |

## Install

```bash
npm install @tetherto/mdk-worker-whatsminer
```

## Usage

```js
const { getKernel } = require('@tetherto/mdk')
const { startWhatsminerWorker } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()

const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  model: 'm56s',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: {
      serialNum: 'WM56S-001',
      container: 'container-A',
      pos: 'A1',
      location: 'site-texas-01.container'
    },
    opts: {
      address: '192.168.1.10',
      port: 14028,           // Whatsminer default API port
      password: 'admin'
    }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — see [USAGE.md](USAGE.md#registering-devices) for the full pattern and the
restart-required caveat.

## Protocol

Whatsminer uses an encrypted TCP API on port 14028. The Worker handles token-based authentication (HMAC-SHA256 challenge-response). Uses the `@tetherto/svc-facs-tcp` facility for connection management.

The API key and set key must be configured per device in `opts`. The Worker automatically negotiates the session token on each connection.

## Telemetry

Live metrics collected on each poll cycle:

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate_rt` | TH/s | Real-time hashrate |
| `hashrate_avg` | TH/s | Average hashrate |
| `power` | W | Current power draw |
| `temperature` | °C | Chip temperature |
| `fan_speed_in` | RPM | Inlet fan speed |
| `fan_speed_out` | RPM | Outlet fan speed |
| `status` | — | Device operational status |
| `uptime` | s | Seconds since last boot |
| `accepted_shares` | — | Total accepted shares |
| `rejected_shares` | — | Total rejected shares |
| `pool_url` | — | Active pool URL |
| `efficiency` | W/TH | Power efficiency ratio |
| `power_mode` | — | Current power mode (e.g. `normal`, `low`, `high`) |

## Commands

| Command | Parameters | Notes |
|---------|-----------|-------|
| `reboot` | — | Takes 2–3 min to resume; max once per 5 min |
| `setPowerMode` | `mode: string` | e.g. `normal`, `low`, `high`, `sleep` |
| `setLED` | `enabled: boolean` | Physical LED blink |
| `setupPools` | `pools: object` | Pool URL, worker, password |
| `setPowerPct` | `pct: number (0–100)` | Fine-grained power control |
| `rackReboot` | — | Restart the Worker process |
| `downloadLogs` | — | Pull raw diagnostic logs from hardware |

Plus the standard device management commands: `registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Alerts:**
- `alert.overheat` — chip temperature exceeded threshold
- `alert.fan_failure` — fan RPM below required minimum (fan RPM = 0 is mechanical failure)
- `alert.psu_failure` — power supply unit error
- `alert.hashrate_low` — hashrate below expected (may be board tuning — wait 15 min before escalating)

**Troubleshooting rules (from contract):**
- If `alert.overheat`: verify fan speeds. Fan speed of 0 is a mechanical failure.
- If `alert.hashrate_low`: miner may be tuning boards — wait 15 minutes.
- If status is `OFFLINE`: do not attempt reboot. Escalate to operator.

## Development with Mock Server

The package ships a mock TCP server that simulates the Whatsminer API:

```js
const wmMock = require('@tetherto/mdk-worker-whatsminer/mock/server')

wmMock.createServer({
  port: 14028,
  host: '127.0.0.1',
  type: 'm56s',
  serial: 'WM-001',
  password: 'admin'
})
```

## Testing

```bash
cd backend/workers/miners/whatsminer
npm test
```
