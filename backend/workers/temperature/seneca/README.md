# @tetherto/mdk-worker-seneca

MDK Worker for Seneca temperature sensors. Reads ambient temperature via Modbus TCP. Supports the Z-4RTD-2 model.

## Supported Models

Single device family — `startSenecaWorker` takes no `model` option.

## Install

```bash
npm install @tetherto/mdk-worker-seneca
```

## Usage

```js
const { getKernel } = require('@tetherto/mdk')
const { startSenecaWorker } = require('@tetherto/mdk-worker-seneca')

const kernel = await getKernel()

const worker = await startSenecaWorker({
  workerId: 'seneca-rack-1',
  storeDir: './store/seneca-rack-1',
  seedDevices: [{
    info: {
      serialNum: 'SEN-A',
      container: 'container-A',
      pos: 'lv_1',                 // sensor position label
      location: 'site-texas-01.container'
    },
    opts: {
      address: '192.168.1.200',
      port: 502,                   // Modbus TCP default port
      unitId: 0,                   // Modbus unit ID
      register: 3                  // Modbus register address for temperature channel
    }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startSenecaWorker` again with no `seedDevices`) — there is no
hot-add.

## Protocol

Modbus TCP on port 502. The `unitId` and `register` identify the specific measurement channel on the device.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `temperature` | °C | Ambient temperature reading from the sensor |

## Commands

Temperature sensors are read-only. Standard device management commands are supported: `registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock Server

Run the mock standalone — the model `type` is the first argument (case-insensitive):

```bash
npm run mock seneca
```

Programmatic:

```js
const senMock = require('@tetherto/mdk-worker-seneca/mock/server')
senMock.createServer({ host: '127.0.0.1', port: 502, type: 'seneca' })
```

## Testing

```bash
cd backend/workers/temperature/seneca
npm test
```
