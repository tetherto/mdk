# miningos-lib-powermeter-schneider

MiningOS library for **Schneider Electric** power meters over **Modbus TCP**. It plugs into the MiningOS powermeter template (`miningos-tpl-lib-powermeter`) and uses the shared Modbus facility (`svc-facs-modbus`) to read registers and expose normalized stats (for example active power in watts and derived line tension).

## Supported devices

| Export | Model | Notes |
|--------|--------|--------|
| `SCHNEIDER_P3U30` | P3U30 | Compact reads from a single holding-register block |
| `SCHNEIDER_PM5340` | PM5340 | Larger register map read in chunks |

## Requirements

- Node.js **20** or newer

## Install

```bash
npm install miningos-lib-powermeter-schneider
```

Dependencies are pulled from the Tether MiningOS GitHub org; ensure your environment can access those repositories if you install from source.

## Usage

The package exports **powermeter managers**—one class per supported meter type. Each manager extends the MiningOS powermeter manager: call `init()`, register devices with `registerThing()`, then collect snapshots as the framework schedules collection (or read `thg.ctrl.getSnap()` where applicable).

### 1. Create and start a manager

```javascript
const { SCHNEIDER_P3U30 } = require('miningos-lib-powermeter-schneider')

const manager = new SCHNEIDER_P3U30(
  {}, // service-level config (merged with your MiningOS setup)
  {
    rack: 'my-rack-id',
    storeDir: '/path/to/store', // persistent store directory
    root: '/path/to/app-root'   // app root (config under root/config, etc.)
  }
)

await manager.init()
manager.active = true
```

Use `SCHNEIDER_PM5340` the same way for a PM5340.

### 2. Register a meter (Modbus TCP)

Each device needs a reachable **IP**, **TCP port** (commonly **502** for Modbus), and **unit ID** (Modbus slave / unit id).

```javascript
await manager.registerThing({
  info: { serialNum: 'meter-001' },
  opts: {
    address: '192.168.1.100',
    port: 502,
    unitId: 1
  }
})
```

If `address`, `port`, or `unitId` is missing, the manager will not connect that thing (`connectThing` returns `0`).

### 3. Snapshots and stats

After registration and background collection, snapshots include `success` and `stats` with at least:

- `stats.power_w` — active power (watts)
- `stats.tension_v` — derived line tension (volts)
- `stats.powermeter_specific` — model-specific instantaneous values

Exact fields under `powermeter_specific` depend on the model (P3U30 vs PM5340).

### Configuration

Thing-level options such as `timeout` for Modbus reads can be supplied via your MiningOS thing config (for example `config/base.thing.json` with a `powermeter` section). The integration tests use a `powermeter.timeout` value in milliseconds.

## Development

```bash
npm install
npm test        # lint + unit + integration tests
npm run lint    # StandardJS
```

Integration tests use a local Modbus mock server under `mock/`.

## License

Apache-2.0
