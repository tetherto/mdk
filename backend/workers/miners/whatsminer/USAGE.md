# Whatsminer worker

Drives MicroBT Whatsminer Bitcoin miners over an encrypted TCP API with token-based authentication. Supports five model families: M30S+, M30S++, M53S, M56S, and M63.

This page documents what's specific to Whatsminer: the SDK surface: the manager classes this package exports, how to run a mock device, and the shape of `registerThing` options. For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](mdk-contract.json) directly. For model coverage across all workers, see the [generated catalogue](../../docs/supported-hardware.md#miners).

For the canonical install pattern that applies to every worker in the monorepo, see [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md). 

## Exported manager classes

| Class | Model | Rack type | Mock `type` value |
| --- | --- | --- | --- |
| `WM_M30SP` | M30S+ | `miner-wm-m30sp` | `m30sp` |
| `WM_M30SPP` | M30S++ | `miner-wm-m30spp` | `m30spp` |
| `WM_M53S` | M53S | `miner-wm-m53s` | `m53s` |
| `WM_M56S` | M56S | `miner-wm-m56s` | `m56s` |
| `WM_M63` | M63 | `miner-wm-m63` | `m63` |

Import:

```js
const { WM_M30SP, WM_M30SPP, WM_M53S, WM_M56S, WM_M63 } = require('@tetherto/miner-whatsminer')
```

## Run a mock device

The mock binds a TCP server that answers Whatsminer's native API (encrypted, token-authenticated) with canned data. The model `type` parameter controls which response set the mock serves (from `mock/initial_states/<type>/`).

Standalone:

```bash
node backend/workers/miners/whatsminer/mock/server.js --port 14028 --type m56s
```

Programmatic — this is what the examples use:

```js
const wmMock = require('@tetherto/miner-whatsminer/mock/server')
wmMock.createServer({
  port: 14028,
  host: '127.0.0.1',
  type: 'm56s',
  serial: 'WM-001',
  password: 'admin'
})
```

| `createServer` option | Type | Default | Notes |
| --- | --- | --- | --- |
| `port` | number | required | TCP port to bind. |
| `host` | string | `'127.0.0.1'` | Interface to bind. |
| `type` | string | required | One of `m30sp`, `m30spp`, `m53s`, `m56s`, `m63`. |
| `serial` | string | required | Serial number reported by the mock. |
| `password` | string | `'admin'` | Password the mock derives its token-auth key from. |

The mock control agent (`mock-control-agent.js`) lets tests mutate mock state at runtime; it's documented in code and used by the integration tests at [`tests/integration/whatsminer.test.js`](tests/integration/whatsminer.test.js).

## Registering a thing

After `startWorker(WM_M56S, { ork })`, register one or more Whatsminer devices:

```js
await manager.registerThing({
  info: {
    container: 'site-1',
    serialNum: 'WM-001'
  },
  opts: {
    address: '127.0.0.1',
    port: 14028,
    password: 'admin'
  }
})
```

| `opts` field | Type | Required | Notes |
| --- | --- | --- | --- |
| `address` | string | yes | Device IP or hostname. |
| `port` | number | yes | TCP API port (real devices use 14028; mocks use the bound port). |
| `password` | string | yes | Whatsminer API password; the worker negotiates a session token from it (HMAC-SHA256 challenge-response). No separate username. |

`info` is free-form metadata stored alongside the registration; common fields used by the dashboard are `container`, `serialNum`, `macAddress`, `pos`, and `site`. Nothing in `info` affects worker behavior — it travels with the device for downstream consumers.

## Runnable examples

One runnable file per model — each starts an ORK, registers one mock device, and stays running until Ctrl+C. Run from the repo root:

| Model | Example |
| --- | --- |
| M30S+ | [`examples/run-m30sp.js`](examples/run-m30sp.js) |
| M30S++ | [`examples/run-m30spp.js`](examples/run-m30spp.js) |
| M53S | [`examples/run-m53s.js`](examples/run-m53s.js) |
| M56S | [`examples/run-m56s.js`](examples/run-m56s.js) |
| M63 | [`examples/run-m63.js`](examples/run-m63.js) |

```bash
node backend/workers/miners/whatsminer/examples/run-m56s.js
```

The M56S example is the per-worker mirror of [`examples/backend/miners/mdk.client.miner.js`](../../../../examples/backend/miners/mdk.client.miner.js).

## Capabilities

The full telemetry list (real-time/average hashrate, power, temperature, fan speeds, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, `setLED`, `setupPools`, `setPowerPct`, ...) is in [`mdk-contract.json`](mdk-contract.json). Per-model alert thresholds live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## Next steps

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide worker install pattern
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this worker
- [`docs/concepts/terminology.md`](../../../../docs/concepts/terminology.md) — vocabulary (ORK, worker, manager, thing, mock)
- [`mdk-contract.json`](mdk-contract.json) — runtime contract source of truth
