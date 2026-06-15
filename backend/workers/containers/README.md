# workers/containers

Mining container orchestration workers. Containers are physical enclosures that house miners and manage shared infrastructure (cooling, power distribution, network). Each container worker controls the enclosure's management system independently from the miners inside it.

## Packages

| Directory | Package | Description |
|-----------|---------|-------------|
| [`base/`](./base/) | `@tetherto/tpl-lib-container` | `ContainerManager` — base class for all container workers |
| [`antspace/`](./antspace/README.md) | `@tetherto/container-antspace` | Antspace HK3 hyperscale container |
| [`microbt/`](./microbt/README.md) | `@tetherto/container-microbt` | MicroBT container system |
| [`bitdeer/`](./bitdeer/README.md) | `@tetherto/container-bitdeer` | Bitdeer platform integration |

## What Container Workers Manage

Container workers manage the physical enclosure infrastructure — distinct from the miners inside it:

- **Thermal management** — enclosure temperature zones, cooling setpoints
- **Power distribution** — PDU monitoring and control
- **Network configuration** — internal switch, IP assignment
- **Environmental monitoring** — ambient temperature, humidity

The miners inside a container each have their own separate worker process (`workers/miners/*`). Container and miner workers both register with the same ORK, which routes commands to each independently.

## Topology Example

```
container-A (Antspace HK3)   ← managed by antspace worker
├── WM56S-001                ← managed by whatsminer worker
├── WM56S-002                ← managed by whatsminer worker
│   ... (10 miners total)
├── ABB B23 power meter      ← managed by power-meter/abb worker
└── Seneca sensor            ← managed by temperature/seneca worker
```

## Quick Start

```js
const { AS_HK3 } = require('@tetherto/container-antspace')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(AS_HK3, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'HK3-A', container: 'container-A', location: 'site-texas-01.container' },
  opts: { address: '192.168.1.100', port: 18001 }
})
```
