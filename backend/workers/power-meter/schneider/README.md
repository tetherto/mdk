# @tetherto/mdk-worker-schneider

MDK Worker for Schneider Electric power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports P3U30 and PM5340 models.

## Supported Models

| `model` value | Model |
|--------|--------|
| `p3u30` | EasyLogic PM3250 (P3U30) |
| `pm5340` | Acti9 PowerTag / PM5340 |

## Install

```bash
npm install @tetherto/mdk-worker-schneider
```

## Usage

```js
const { getKernel } = require('@tetherto/mdk')
const { startSchneiderWorker } = require('@tetherto/mdk-worker-schneider')

const kernel = await getKernel()

const worker = await startSchneiderWorker({
  workerId: 'schneider-rack-1',
  model: 'pm5340',
  storeDir: './store/schneider-rack-1',
  seedDevices: [{
    info: { serialNum: 'SCHN-A', container: 'container-A' },
    opts: { address: '192.168.1.152', port: 502, unitId: 1 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startSchneiderWorker` again with no `seedDevices`) — there is no
hot-add.

## Protocol

Modbus TCP on port 502 (configurable).

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `voltage` | V | 3-phase voltage |
| `current` | A | 3-phase current |
| `active_power` | W | Active power |
| `power_factor` | — | Power factor (0–1) |
| `frequency` | Hz | Line frequency |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Testing

```bash
cd backend/workers/power-meter/schneider
npm test
```
