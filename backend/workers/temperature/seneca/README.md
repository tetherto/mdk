# @tetherto/sensor-seneca

MDK worker for Seneca temperature sensors. Reads ambient temperature via Modbus TCP. Supports the Z-4RTD-2 model.

## Supported Models

| Export | Model |
|--------|-------|
| `SENECA` | Seneca Z-4RTD-2 |

## Install

```bash
npm install @tetherto/sensor-seneca
```

## Usage

```js
const { SENECA } = require('@tetherto/sensor-seneca')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(SENECA, { ork, rack: 'site-1' })

await manager.registerThing({
  info: {
    serialNum: 'SEN-A',
    container: 'container-A',
    pos: 'lv_1',                 // sensor position label
    location: 'site-texas-01.container'
  },
  opts: {
    address: '192.168.1.200',
    port: 502,                   // Modbus TCP default port
    unitId: 0,                   // Modbus unit ID
    register: 3                  // Modbus register address for temperature channel
  }
})
```

## Protocol

Modbus TCP on port 502. The `unitId` and `register` identify the specific measurement channel on the device.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `temperature` | °C | Ambient temperature reading from the sensor |

## Commands

Temperature sensors are read-only. Standard device management commands are supported: `registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock Server

```js
const senMock = require('@tetherto/sensor-seneca/mock/server')
senMock.createServer({ host: '127.0.0.1', port: 502, type: 'seneca' })
```

## Testing

```bash
cd backend/workers/temperature/seneca
npm test
```
