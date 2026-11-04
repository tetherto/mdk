# @tetherto/mdk-worker-schneider

MDK Worker for Schneider Electric power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports P3U30 and PM5340 models.

## Supported models

| `model` value | Model |
|--------|--------|
| `p3u30` | EasyLogic PM3250 (P3U30) |
| `pm5340` | Acti9 PowerTag / PM5340 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-schneider` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-schneider` into `node_modules`, so the `require` in the usage example
below resolves with no further step. See [the Worker install pattern](../../docs/install-pattern.md) for
what every Worker package ships and how to run one.

## Usage

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startSchneiderWorker } = require('@tetherto/mdk-worker-schneider')

const kernel = await getKernel()

const worker = await startSchneiderWorker({
  workerId: 'schneider-rack-1',
  model: 'pm5340',
  storeDir: './store/schneider-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { serialNum: 'SCHN-A', container: 'container-A' },
    opts: { address: '192.168.1.152', port: 502, unitId: 1 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

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
