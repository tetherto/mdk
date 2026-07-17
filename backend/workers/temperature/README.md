# workers/temperature

Temperature and humidity sensor Workers. These Workers connect to environmental sensors and report ambient conditions through the MDK Protocol. Used to monitor container and rack-level temperatures independent of the miners' chip temperature sensors.

## Packages

| Directory | Package | Device |
|-----------|---------|--------|
| [`seneca/`](./seneca/README.md) | `@tetherto/mdk-worker-seneca` | Seneca Z-4RTD-2 (Modbus TCP) |

## Common Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `temperature` | °C | Ambient temperature reading |

## Deployment

Typically one sensor per container, placed at the air/liquid inlet:

```
container-A
├── 10x miners
├── ABB B23 power meter
└── Seneca Z-4RTD-2 (temperature/seneca Worker) ← inlet monitoring
```

## Quick Start

```js
const { getKernel } = require('@tetherto/mdk')
const { startSenecaWorker } = require('@tetherto/mdk-worker-seneca')

const kernel = await getKernel()

const worker = await startSenecaWorker({
  workerId: 'seneca-rack-1',
  storeDir: './store/seneca-rack-1',
  seedDevices: [{
    info: { serialNum: 'SEN-A', container: 'container-A', pos: 'lv_1' },
    opts: { address: '192.168.1.200', port: 502, unitId: 0, register: 3 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```
