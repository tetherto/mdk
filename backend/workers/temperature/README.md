# workers/temperature

Temperature and humidity sensor workers. These workers connect to environmental sensors and report ambient conditions through the MDK Protocol. Used to monitor container and rack-level temperatures independent of the miners' chip temperature sensors.

## Packages

| Directory | Package | Device |
|-----------|---------|--------|
| [`base/`](./base/) | `@tetherto/tpl-lib-sensor` | `SensorManager` — base class for sensor workers |
| [`seneca/`](./seneca/README.md) | `@tetherto/sensor-seneca` | Seneca Z-4RTD-2 (Modbus TCP) |

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
└── Seneca Z-4RTD-2 (temperature/seneca worker) ← inlet monitoring
```

## Quick Start

```js
const { SENECA } = require('@tetherto/sensor-seneca')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(SENECA, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'SEN-A', container: 'container-A', pos: 'lv_1' },
  opts: { address: '192.168.1.200', port: 502, unitId: 0, register: 3 }
})
```
