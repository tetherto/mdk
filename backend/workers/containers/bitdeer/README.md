# @tetherto/container-bitdeer

MDK worker for Bitdeer D40 mining container systems. Communicates via MQTT. Supports A1346, M30, M56, and S19XP container variants.

## Supported Models

| Export | Model |
|--------|-------|
| `BITDEER_D40_A1346` | D40 container for Avalon A1346 miners |
| `BITDEER_D40_M30` | D40 container for Whatsminer M30 miners |
| `BITDEER_D40_M56` | D40 container for Whatsminer M56 miners |
| `BITDEER_D40_S19XP` | D40 container for Antminer S19XP miners |

## Install

```bash
npm install @tetherto/container-bitdeer
```

## Usage

```js
const { BITDEER_D40_M56 } = require('@tetherto/container-bitdeer')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(BITDEER_D40_M56, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { serialNum: 'D40-M56-001', container: 'container-A' },
  opts: { address: '192.168.1.102', port: 1883 }   // MQTT broker
})
```

## Protocol

Communicates via MQTT. The container management system publishes status topics and subscribes to command topics.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `container_power` | W | Total container power draw |
| `temperature` | °C | Container ambient temperature |
| `tank_status` | — | Cooling tank operational status |
| `exhaust_status` | — | Exhaust fan system status |

## Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `setTankEnabled` | `enabled: boolean` | Enable or disable the cooling tank |
| `setAirExhaustEnabled` | `enabled: boolean` | Enable or disable exhaust fans |
| `resetAlarm` | — | Clear active alarm state |
| `setTemperatureSettings` | `settings: object` | Update temperature control setpoints |
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
- `E_TANK_FAIL` — Tank system failure
- `E_EXHAUST_FAIL` — Exhaust system failure

## Testing

```bash
cd backend/workers/containers/bitdeer
npm test
```
