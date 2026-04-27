# miningos-lib-sensor-temp-seneca

MiningOS sensor library for **SENECA** temperature devices over **Modbus TCP**. It reads a 16-bit holding register, scales the raw value by dividing by 10 to produce a temperature in degrees Celsius (`temp_c`), and exposes snapshots through the standard MiningOS sensor worker API.

A raw register value of **8500** (decoded as **850.0** before scaling) is treated as a device fault and reported as a `sensor_error` in the snapshot.

## Requirements

- Node.js **>= 20**

## Installation

```bash
npm install miningos-lib-sensor-temp-seneca
```

If you install from the Git repository instead of a registry, use your usual `git+https://…` dependency form (see `package.json` in consuming projects).

## Usage

The package exports a single worker class used by the MiningOS control stack:

```js
const { SENECA } = require('miningos-lib-sensor-temp-seneca')
```

`SENECA` is the **TempSenecaSensorManager** worker. After you construct it with your rack/store paths, call `init()`, then register things with Modbus connection options.

### Thing options

Each thing must provide:

| Option     | Description                                      |
| ---------- | ------------------------------------------------ |
| `address`  | Modbus TCP host (e.g. IP or hostname)            |
| `port`     | Modbus TCP port (often `502`)                    |
| `unitId`   | Modbus unit (slave) ID                           |
| `register` | Holding register address to read (function code 3) |

Optional sensor settings (for example `timeout`) come from your worker config under `thing.sensor` as provided by `miningos-tpl-lib-sensor`.

### Example: register a thing and read a snapshot

```js
const { SENECA } = require('miningos-lib-sensor-temp-seneca')

const seneca = new SENECA({}, {
  rack: 'my-rack',
  storeDir: '/path/to/store',
  root: '/path/to/app-root'
})

await seneca.init()
seneca.active = true

await seneca.registerThing({
  info: { serialNum: 'seneca-1' },
  opts: {
    address: '192.168.1.10',
    port: 502,
    unitId: 1,
    register: 3
  }
})

const thg = Object.values(seneca.mem.things)[0]
const snap = await thg.ctrl.getSnap()
// snap.stats.temp_c — temperature in °C
// snap.stats.status — 'ok' or 'error'
```

The manager’s `collectThingSnap` uses the same snapshot shape for scheduled collection.

## Development

```bash
npm install
npm test          # lint + unit + integration tests
npm run lint      # Standard JS
npm run test:unit
npm run test:integration
```

## License

Apache-2.0 (see repository).
