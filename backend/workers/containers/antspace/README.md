# @tetherto/container-antspace

MDK worker for Antspace (Bitmain) mining container systems. Supports the HK3 and IMM models.

## Supported Models

| Export | Model | Description |
|--------|-------|-------------|
| `AS_HK3` | Antspace HK3 | Hyperscale liquid-cooled container |
| `AS_IMM` | Antspace IMM | Immersion cooling system |

## Install

```bash
npm install @tetherto/container-antspace
```

## Usage

```js
const { AS_HK3 } = require('@tetherto/container-antspace')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(AS_HK3, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'HK3-A', container: 'container-A', location: 'site-texas-01.container' },
  opts: { address: '192.168.1.100', port: 18001 }
})
```

## Protocol

Antspace uses a REST HTTP API. The worker connects over HTTP and polls the container management system for thermal and cooling status.

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

```js
const asMock = require('@tetherto/container-antspace/mock/server')
asMock.createServer({ port: 18001, host: '127.0.0.1', type: 'hk3' })
```

## Testing

```bash
cd backend/workers/containers/antspace
npm test
```
