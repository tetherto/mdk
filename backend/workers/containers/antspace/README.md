# @tetherto/mdk-worker-antspace

MDK Worker for Antspace (Bitmain) mining container systems. Supports the HK3 and immersion-cooling models.

## Supported Models

| `model` value | Model | Description |
|--------|-------|-------------|
| `hk3` | Antspace HK3 | Hyperscale liquid-cooled container |
| `immersion` | Antspace immersion | Immersion cooling system |

## Install

```bash
npm install @tetherto/mdk-worker-antspace
```

## Usage

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

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startAntspaceWorker` again with no `seedDevices`) — there is no
hot-add.

## Protocol

Antspace uses a REST HTTP API. The Worker connects over HTTP and polls the container management system for thermal and cooling status.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `inlet_temp` | °C | Inlet air/liquid temperature |
| `outlet_temp` | °C | Outlet air/liquid temperature |
| `liquid_supply_temp` | °C | Liquid coolant supply temperature |
| `cooling_status` | — | Cooling system operational status |

## Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `resetCoolingSystem` | — | Reset the cooling system |
| `setLiquidSupplyTemperature` | `temperature: number` | Set coolant supply temperature setpoint |
| `registerThing` | `info, opts` | Register container |
| `updateThing` | `info` | Update container info |
| `forgetThings` | `ids` | Remove containers |
| `saveSettings` | — | Persist settings |
| `saveComment` | `text` | Add annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Error codes:**
- `E_COOLING_FAIL` — Cooling system failure

## Mock Server

Run the mock standalone — the model `type` (`hk3` or `immersion`, case-insensitive) is the first
argument:

```bash
npm run mock hk3
node mock/server.js --type hk3 --port 18001   # custom port/flags: run the server directly
```

Programmatic:

```js
const asMock = require('@tetherto/mdk-worker-antspace/mock/server')
asMock.createServer({ port: 18001, host: '127.0.0.1', type: 'hk3' })
```

## Testing

```bash
cd backend/workers/containers/antspace
npm test
```
