# workers/power-meter

Power metering workers. These workers connect to electrical measurement devices and utility provider APIs, exposing power consumption data through the MDK Protocol. They enable per-container and per-rack power monitoring alongside miner telemetry.

## Packages

| Directory | Package | Device |
|-----------|---------|--------|
| [`base/`](./base/) | `@tetherto/tpl-lib-powermeter` | `PowerMeterManager` — base class |
| [`abb/`](./abb/README.md) | `@tetherto/powermeter-abb` | ABB B23, B24, M1M20, M4M20, REU615 (Modbus TCP) |
| [`satec/`](./satec/README.md) | `@tetherto/powermeter-satec` | Satec PM180 (Modbus TCP) |
| [`schneider/`](./schneider/README.md) | `@tetherto/powermeter-schneider` | Schneider meters (Modbus TCP) |
| [`electricity/`](./electricity/README.md) | `@tetherto/powermeter-electricity` | Electricity provider REST API |

## Common Telemetry

All hardware power meter workers report 3-phase electrical measurements:

| Field | Unit | Description |
|-------|------|-------------|
| `voltage_v1/v2/v3` | V | Per-phase voltage |
| `current_i1/i2/i3` | A | Per-phase current |
| `active_power` | W | Total real power |
| `reactive_power` | VAR | Total reactive power |

SATEC and Schneider additionally report `power_factor` and `frequency`.

## Protocol

All hardware meters use **Modbus TCP**. The electricity provider worker uses HTTPS REST.

## Quick Start

```js
const { ABB_B23 } = require('@tetherto/powermeter-abb')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(ABB_B23, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'ABB-A', container: 'container-A' },
  opts: { address: '192.168.1.150', port: 502, unitId: 1 }
})
```

## Deployment Topology

Typically one power meter worker manages 1–2 meters, one per container:

```
container-A
├── 10x miners (whatsminer worker)
├── ABB B23 (power-meter/abb worker)   ← monitors container-A power intake
└── Seneca sensor (temperature worker)
```
