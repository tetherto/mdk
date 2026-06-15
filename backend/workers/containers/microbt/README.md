# @tetherto/container-microbt

MDK worker for MicroBT container cooling systems. Supports KEHUA and WONDERINT models via Modbus TCP.

## Supported Models

| Export | Model |
|--------|-------|
| `MICROBT_KEHUA` | KEHUA container system |
| `MICROBT_WONDERINT` | WONDERINT container system |

## Install

```bash
npm install @tetherto/container-microbt
```

## Usage

```js
const { MICROBT_KEHUA } = require('@tetherto/container-microbt')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(MICROBT_KEHUA, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'KEHUA-001', container: 'container-A' },
  opts: { address: '192.168.1.101', port: 8080, unitId: 1 }
})
```

## Protocol

Communicates via Modbus TCP for cooling system control and monitoring.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `fan_threshold` | — | Cooling fan threshold value |
| `operating_status` | — | Current operating status string |
| `power` | W | Container power draw |

## Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `setCoolingFanThreshold` | `threshold: number` | Set cooling fan speed threshold |
| `registerThing` | `info, opts` | Register container |
| `updateThing` | `info` | Update container info |
| `forgetThings` | `ids` | Remove containers |
| `saveSettings` | — | Persist settings |
| `saveComment` | `text` | Add annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Testing

```bash
cd backend/workers/containers/microbt
npm test
```
