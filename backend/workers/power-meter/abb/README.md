# @tetherto/powermeter-abb

MDK worker for ABB power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports B23, B24, M1M20, M4M20, and REU615 models.

## Supported Models

| Export | Models |
|--------|--------|
| `ABB_B23` | B23, B24, M1M20, M4M20, REU615 |

## Install

```bash
npm install @tetherto/powermeter-abb
```

## Usage

```js
const { ABB_B23 } = require('@tetherto/powermeter-abb')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(ABB_B23, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'ABB-A', container: 'container-A', location: 'site-texas-01.container' },
  opts: {
    address: '192.168.1.150',
    port: 502,          // Modbus TCP default port
    unitId: 1           // Modbus unit ID
  }
})
```

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

## Mock Server

```js
const abbMock = require('@tetherto/powermeter-abb/mock/server')
abbMock.createServer({ host: '127.0.0.1', port: 502, type: 'B23' })
```

## Testing

```bash
cd backend/workers/power-meter/abb
npm test
```
