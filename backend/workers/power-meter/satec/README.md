# @tetherto/powermeter-satec

MDK worker for Satec power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports the PM180 model.

## Supported Models

| Export | Model |
|--------|-------|
| `SATEC_PM180` | Satec PM180 |

## Install

```bash
npm install @tetherto/powermeter-satec
```

## Usage

```js
const { SATEC_PM180 } = require('@tetherto/powermeter-satec')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(SATEC_PM180, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'SATEC-A', container: 'container-A' },
  opts: { address: '192.168.1.151', port: 502, unitId: 1 }
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
cd backend/workers/power-meter/satec
npm test
```
