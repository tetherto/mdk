# @tetherto/mdk-worker-satec

MDK Worker for Satec power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports the PM180 model.

## Supported Models

| `model` value | Model |
|--------|-------|
| `pm180` | Satec PM180 |

## Install

```bash
npm install @tetherto/mdk-worker-satec
```

## Usage

```js
const { getKernel } = require('@tetherto/mdk')
const { startSatecWorker } = require('@tetherto/mdk-worker-satec')

const kernel = await getKernel()

const worker = await startSatecWorker({
  workerId: 'satec-rack-1',
  model: 'pm180',
  storeDir: './store/satec-rack-1',
  seedDevices: [{
    info: { serialNum: 'SATEC-A', container: 'container-A' },
    opts: { address: '192.168.1.151', port: 502, unitId: 1 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startSatecWorker` again with no `seedDevices`) — there is no
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
cd backend/workers/power-meter/satec
npm test
```
