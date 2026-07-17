# workers/containers

Mining container orchestration Workers. Containers are physical enclosures that house miners and manage shared infrastructure (cooling, power distribution, network). Each container Worker controls the enclosure's management system independently from the miners inside it.

## Packages

| Directory | Package | Description |
|-----------|---------|-------------|
| [`antspace/`](./antspace/README.md) | `@tetherto/mdk-worker-antspace` | Antspace HK3 hyperscale container |
| [`bitdeer/`](./bitdeer/README.md) | `@tetherto/mdk-worker-bitdeer` | Bitdeer platform integration |

## What Container Workers Manage

Container Workers manage the physical enclosure infrastructure — distinct from the miners inside it:

- **Thermal management** — enclosure temperature zones, cooling setpoints
- **Power distribution** — PDU monitoring and control
- **Network configuration** — internal switch, IP assignment
- **Environmental monitoring** — ambient temperature, humidity

The miners inside a container each have their own separate Worker process (`workers/miners/*`). Container and miner Workers both register with the same Kernel, which routes commands to each independently.

## Topology Example

```
container-A (Antspace HK3)   ← managed by antspace Worker
├── WM56S-001                ← managed by whatsminer Worker
├── WM56S-002                ← managed by whatsminer Worker
│   ... (10 miners total)
├── ABB B23 power meter      ← managed by power-meter/abb Worker
└── Seneca sensor            ← managed by temperature/seneca Worker
```

## Quick Start

```js
const { getKernel } = require('@tetherto/mdk')
const { startAntspaceWorker } = require('@tetherto/mdk-worker-antspace')

const kernel = await getKernel()

const worker = await startAntspaceWorker({
  workerId: 'antspace-rack-1',
  model: 'hk3',
  storeDir: './store/antspace-rack-1',
  seedDevices: [{
    info: { serialNum: 'HK3-A', container: 'container-A', location: 'site-texas-01.container' },
    opts: { address: '192.168.1.100', port: 18001 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```
