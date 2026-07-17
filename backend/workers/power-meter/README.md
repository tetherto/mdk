# workers/power-meter

Power metering Workers. These Workers connect to electrical measurement devices, exposing power consumption data through the MDK Protocol. They enable per-container and per-rack power monitoring alongside miner telemetry.

## Packages

| Directory | Package | Device |
|-----------|---------|--------|
| [`abb/`](./abb/README.md) | `@tetherto/mdk-worker-abb` | ABB B23, B24, M1M20, M4M20, REU615 (Modbus TCP) |
| [`satec/`](./satec/README.md) | `@tetherto/mdk-worker-satec` | Satec PM180 (Modbus TCP) |
| [`schneider/`](./schneider/README.md) | `@tetherto/mdk-worker-schneider` | Schneider meters (Modbus TCP) |

## Common Telemetry

All hardware power meter Workers report 3-phase electrical measurements:

| Field | Unit | Description |
|-------|------|-------------|
| `voltage_v1/v2/v3` | V | Per-phase voltage |
| `current_i1/i2/i3` | A | Per-phase current |
| `active_power` | W | Total real power |
| `reactive_power` | VAR | Total reactive power |

SATEC and Schneider additionally report `power_factor` and `frequency`.

## Protocol

All meters use **Modbus TCP**.

## Quick Start

```js
const { getKernel } = require('@tetherto/mdk')
const { startAbbWorker } = require('@tetherto/mdk-worker-abb')

const kernel = await getKernel()

const worker = await startAbbWorker({
  workerId: 'abb-rack-1',
  model: 'b23',
  storeDir: './store/abb-rack-1',
  seedDevices: [{
    info: { serialNum: 'ABB-A', container: 'container-A' },
    opts: { address: '192.168.1.150', port: 502, unitId: 1 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

## Deployment Topology

Typically one power meter Worker manages 1–2 meters, one per container:

```
container-A
├── 10x miners (whatsminer Worker)
├── ABB B23 (power-meter/abb Worker)   ← monitors container-A power intake
└── Seneca sensor (temperature Worker)
```
