# miningos-lib-powermeter-satec

MiningOS power meter integration for **Satec** devices (Modbus TCP, PM180 register map). It extends [`miningos-tpl-lib-powermeter`](https://github.com/tetherto/miningos-tpl-lib-powermeter) and reads holding registers to produce snapshots with per-phase voltage and current, real/reactive/apparent power, power factor, THD, and a rolling **15-minute average** of real import power.

## Requirements

- Node.js **20** or newer

## Install

```bash
npm install miningos-lib-powermeter-satec
```

## Usage

The package exports a single manager class as `SATEC`. Instantiate it with your MiningOS-style `thing` config and runtime paths, call `init()`, then register devices with Modbus connection options.

```javascript
const { SATEC } = require('miningos-lib-powermeter-satec')

const manager = new SATEC(
  {
    thing: {
      collectSnapsItvMs: 60000,        // snapshot collection interval (ms)
      collectSnapTimeoutMs: 5000,
      storeSnapItvMs: 60000,
      thingQueryConcurrency: 1,
      powermeter: {}                   // optional powermeter-specific config
    }
  },
  {
    rack: 'my-rack',
    storeDir: '/path/to/store',
    root: process.cwd()
  }
)

await manager.init()
manager.active = true

await manager.registerThing({
  info: { serialNum: 'PM180-001', pos: 'site' },
  opts: {
    address: '192.168.1.10',  // Modbus TCP host
    port: 502,                // Modbus TCP port (often 502)
    unitId: 1                 // Modbus unit/slave id
  }
})

// Periodic collection is driven by your control loop; see tests/integration for a full flow.
await manager.collectSnaps()
```

Each registered thing must provide `opts.address`, `opts.port`, and `opts.unitId`. Successful snaps include `stats.power_w`, `stats.tension_v`, and `stats.powermeter_specific` (instantaneous and historical fields).

## Development

```bash
npm install
npm test
```

`npm test` runs linting plus unit and integration tests. Integration tests use a local Modbus mock server.

## License

Apache-2.0
