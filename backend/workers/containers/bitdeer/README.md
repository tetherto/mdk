# @tetherto/mdk-worker-bitdeer

MDK Worker for Bitdeer D40 mining container systems. Communicates via MQTT. Supports A1346, M30, M56, and S19XP container variants.

## Supported Models

| `model` value | Model |
|--------|-------|
| `a1346` | D40 container for Avalon A1346 miners |
| `m30` | D40 container for Whatsminer M30 miners |
| `m56` | D40 container for Whatsminer M56 miners |
| `s19xp` | D40 container for Antminer S19XP miners |

## Install

```bash
npm install @tetherto/mdk-worker-bitdeer
```

## Usage

`startBitdeerWorker(opts)` embeds an MQTT broker (one per worker process, default port `10883`, override with
`opts.mqttPort`) that the containers publish into. Device specs are keyed by `containerId`, not address/port:

```js
const { getKernel } = require('@tetherto/mdk')
const { startBitdeerWorker } = require('@tetherto/mdk-worker-bitdeer')

const kernel = await getKernel()

const worker = await startBitdeerWorker({
  workerId: 'bitdeer-rack-1',
  model: 'm56',
  storeDir: './store/bitdeer-rack-1',
  mqttPort: 10883,
  seedDevices: [{
    info: { serialNum: 'D40-M56-001', container: 'container-A' },
    opts: { containerId: 'D40-M56-001' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startBitdeerWorker` again with no `seedDevices`) — there is no
hot-add.

## Protocol

Communicates via MQTT. The embedded broker accepts container connections; the container management system publishes status topics and subscribes to command topics.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `container_power` | W | Total container power draw |
| `temperature` | °C | Container ambient temperature |
| `tank_status` | — | Cooling tank operational status |
| `exhaust_status` | — | Exhaust fan system status |

## Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `setTankEnabled` | `enabled: boolean` | Enable or disable the cooling tank |
| `setAirExhaustEnabled` | `enabled: boolean` | Enable or disable exhaust fans |
| `resetAlarm` | — | Clear active alarm state |
| `setTemperatureSettings` | `settings: object` | Update temperature control setpoints |
| `registerThing` | `info, opts` | Register container |
| `updateThing` | `info` | Update container info |
| `forgetThings` | `ids` | Remove containers |
| `saveSettings` | — | Persist settings |
| `saveComment` | `text` | Add annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Error codes:**
- `E_TANK_FAIL` — Tank system failure
- `E_EXHAUST_FAIL` — Exhaust system failure

## Testing

```bash
cd backend/workers/containers/bitdeer
npm test
```
