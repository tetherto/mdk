# miningos-lib-powermeter-abb

Node.js library that integrates **ABB power meters** with MiningOS using **Modbus TCP**. It extends [`miningos-tpl-lib-powermeter`](https://github.com/tetherto/miningos-tpl-lib-powermeter) with ABB-specific register maps and snapping, and uses [`svc-facs-modbus`](https://github.com/tetherto/svc-facs-modbus) for the Modbus client.

## Supported devices

| Export        | Device / line |
|---------------|----------------|
| `ABB_B23`     | ABB B23        |
| `ABB_B24`     | ABB B24        |
| `ABB_M1M20`   | ABB M1M20      |
| `ABB_M4M20`   | ABB M4M20      |
| `ABB_REU615`  | ABB REU615     |

Pick the manager class that matches the meter model connected on the bus.

## Requirements

- **Node.js** >= 20

## Installation

```bash
npm install miningos-lib-powermeter-abb
```

Or install from the Git repository if the package is not published to your registry:

```bash
npm install git+https://github.com/tetherto/miningos-lib-powermeter-abb.git
```

## Usage

### 1. Import the manager for your meter model

The package’s main entry re-exports one class per supported type:

```js
const { ABB_B23 } = require('miningos-lib-powermeter-abb')
// or: ABB_B24, ABB_M1M20, ABB_M4M20, ABB_REU615
```

### 2. Construct the manager with thing config and runtime options

The manager follows the MiningOS “thing” pattern: you pass **thing configuration** (including optional `thing.powermeter` settings) and **facility options** such as storage paths. Call **`init()`** before registering devices.

```js
const manager = new ABB_B23(
  {
    thing: {
      scheduleAddlStatConfigTfs: [],
      collectSnapsItvMs: 5000,
      powermeter: {} // model-specific powermeter config (see tpl-lib-powermeter)
    }
  },
  {
    rack: 'rack-1',
    storeDir: '/path/to/store',
    root: '/path/to/app-root'
  }
)

await manager.init()
manager.active = true
```

### 3. Register a meter with Modbus connection options

Each registered thing must provide **`opts.address`**, **`opts.port`**, and **`opts.unitId`** (Modbus TCP host, port, and slave/unit id). Without these, the manager will not connect the device.

```js
manager.registerThing({
  info: {
    serialNum: 'PM-001'
  },
  opts: {
    address: '192.168.1.50',
    port: 502,
    unitId: 1,
    timeout: 5000 // optional; used for reads
  }
})
```

The manager connects over **Modbus TCP**, polls according to the template configuration, and exposes snaps/stats through the parent powermeter manager behavior.

### 4. Shut down cleanly

When stopping the process, disconnect registered things and stop any internal facilities (intervals, schedulers, stores) your deployment uses, consistent with other MiningOS thing managers.

## Configuration

Example JSON fragments live under `config/` in this repository (`common.json`, `base.thing.json`). Align `collectSnapsItvMs`, logging, and `thing.powermeter` with your deployment and the base powermeter template expectations.

## Development

```bash
npm install
npm test          # lint + unit + integration tests
npm run lint
npm run test:unit
npm run test:integration
```

Integration tests can use the in-repo Modbus mock under `mock/` when exercising end-to-end registration and snapping.

## License

Apache-2.0
