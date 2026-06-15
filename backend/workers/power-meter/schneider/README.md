# @tetherto/powermeter-schneider

MDK worker for Schneider Electric power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports P3U30 and PM5340 models.

## Supported Models

| Export | Models |
|--------|--------|
| `SCHNEIDER_P3U30` | EasyLogic PM3250 (P3U30) |
| `SCHNEIDER_PM5340` | Acti9 PowerTag / PM5340 |

## Install

```bash
npm install @tetherto/powermeter-schneider
```

## Usage

```js
const { SCHNEIDER_PM5340 } = require('@tetherto/powermeter-schneider')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(SCHNEIDER_PM5340, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'SCHN-A', container: 'container-A' },
  opts: { address: '192.168.1.152', port: 502, unitId: 1 }
})
```

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
