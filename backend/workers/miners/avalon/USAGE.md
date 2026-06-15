# Avalon worker

Drives Canaan Avalon Bitcoin miners over the native TCP CGMiner API. Supports one model family today: A1346.

This page documents what's specific to Avalon: the SDK surface: the manager class this package exports, how to run a mock device, and the shape of `registerThing` options. For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](mdk-contract.json) directly. For model coverage across all workers, see the [generated catalogue](../../docs/supported-hardware.md#miners).

For the canonical install pattern that applies to every worker in the monorepo, see [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md). 

## Exported manager classes

| Class | Model | Rack type | Mock `type` value |
| --- | --- | --- | --- |
| `AV_A1346` | A1346 | `miner-av-a1346` | `a1346` |

Import:

```js
const { AV_A1346 } = require('@tetherto/miner-avalon')
```

## Running a mock device

The mock binds a TCP server that answers Avalon's native CGMiner API with canned data. The model `type` parameter controls which response set the mock serves (from `mock/initial_states/<type>/`).

Standalone:

```bash
node backend/workers/miners/avalon/mock/server.js --port 14030 --type a1346
```

Programmatic — this is what the example uses:

```js
const avMock = require('@tetherto/miner-avalon/mock/server')
avMock.createServer({
  port: 14030,
  host: '127.0.0.1',
  type: 'a1346',
  serial: 'AV-001'
})
```

| `createServer` option | Type | Default | Notes |
| --- | --- | --- | --- |
| `port` | number | `4028` | TCP port to bind. |
| `host` | string | `'127.0.0.1'` | Interface to bind. |
| `type` | string | required | Only `a1346` today. |
| `serial` | string | required | Serial number reported by the mock. |

The mock control agent (`mock-control-agent.js`) lets tests mutate mock state at runtime; it's documented in code and used by the integration tests at [`tests/integration/avalon.miner.test.js`](tests/integration/avalon.miner.test.js).

## Registering a thing

After `startWorker(AV_A1346, { ork })`, register one or more Avalon devices:

```js
await manager.registerThing({
  info: {
    container: 'site-1',
    serialNum: 'AV-001'
  },
  opts: {
    address: '127.0.0.1',
    port: 14030
  }
})
```

| `opts` field | Type | Required | Notes |
| --- | --- | --- | --- |
| `address` | string | yes | Device IP or hostname. |
| `port` | number | yes | TCP CGMiner API port (real devices use 4028; mocks use the bound port). |

The Avalon CGMiner API is unauthenticated, so no username or password is required in `opts`.

`info` is free-form metadata stored alongside the registration; common fields used by the dashboard are `container`, `serialNum`, `macAddress`, `pos`, and `site`. Nothing in `info` affects worker behavior — it travels with the device for downstream consumers.

## Runnable example

[`examples/run-a1346.js`](examples/run-a1346.js) — start an ORK, register one mock A1346, and stay running until Ctrl+C. Run from the repo root:

```bash
node backend/workers/miners/avalon/examples/run-a1346.js
```

This is the Avalon mirror of [`backend/core/examples/miners/mdk.client.miner.js`](../../../core/examples/miners/mdk.client.miner.js), which uses Whatsminer.

## Capabilities

The full telemetry list (real-time/average hashrate, power, temperature, fan speeds, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, `setLED`, `setupPools`, ...) is in [`mdk-contract.json`](mdk-contract.json). Per-model alert thresholds live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## Next steps

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide worker install pattern
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this worker
- [`docs/concepts/terminology.md`](../../../../docs/concepts/terminology.md) — vocabulary (ORK, worker, manager, thing, mock)
- [`mdk-contract.json`](mdk-contract.json) — runtime contract source of truth
