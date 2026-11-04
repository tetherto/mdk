# @tetherto/mdk-worker-abb

MDK Worker for ABB power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports B23, B24, M1M20, M4M20, and REU615 models.

## Supported models

| `model` value | Model |
|--------|--------|
| `b23` | ABB B23 |
| `b24` | ABB B24 |
| `m1m20` | ABB M1M20 |
| `m4m20` | ABB M4M20 |
| `reu615` | ABB REU615 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-abb` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-abb` into `node_modules`, so the `require` in the usage example
below resolves with no further step. See [the Worker install pattern](../../docs/install-pattern.md) for
what every Worker package ships and how to run one.

## Usage

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAbbWorker } = require('@tetherto/mdk-worker-abb')

const kernel = await getKernel()

const worker = await startAbbWorker({
  workerId: 'abb-rack-1',
  model: 'b23',
  storeDir: './store/abb-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { serialNum: 'ABB-A', container: 'container-A', location: 'site-a-01.container' },
    opts: {
      address: '192.168.1.150',
      port: 502,          // Modbus TCP default port
      unitId: 1           // Modbus unit ID
    }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startAbbWorker` again with no `seedDevices`) — there is no
hot-add.

## Protocol

Modbus TCP on port 502 (configurable). The `unitId` identifies the specific meter on a shared Modbus network.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `voltage_v1` | V | Phase 1 voltage |
| `voltage_v2` | V | Phase 2 voltage |
| `voltage_v3` | V | Phase 3 voltage |
| `current_i1` | A | Phase 1 current |
| `current_i2` | A | Phase 2 current |
| `current_i3` | A | Phase 3 current |
| `active_power` | W | Total active (real) power |
| `reactive_power` | VAR | Total reactive power |

## Commands

Power meters are primarily read-only. Standard device management commands are supported: `registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock server

Run the mock standalone — the model `type` is the first argument (case-insensitive):

```bash
npm run mock b23
```

Programmatic:

```js
const abbMock = require('@tetherto/mdk-worker-abb/mock/server')
abbMock.createServer({ host: '127.0.0.1', port: 502, type: 'B23' })
```

## Testing

```bash
cd backend/workers/power-meter/abb
npm test
```
