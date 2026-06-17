# Antminer worker

Drives Bitmain Antminer Bitcoin miners over HTTP with digest authentication. Supports four model families: S19XP, S19XP Hydro, S21, and S21 Pro.

This page documents the SDK surface: the manager classes this package exports, how to run a mock device, and the shape of `registerThing` options. 
For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](mdk-contract.json) directly.

For the canonical install pattern that applies to every worker in the monorepo, see [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md). 
This page only documents what's specific to Antminer.

## Exported manager classes

| Class | Model | Rack type | Mock `type` value |
| --- | --- | --- | --- |
| `AM_S19XP` | S19 XP | `miner-am-s19xp` | `s19xp` |
| `AM_S19XPH` | S19 XP Hydro | `miner-am-s19xp_h` | `s19xp_h` |
| `AM_S21` | S21 | `miner-am-s21` | `s21` |
| `AM_S21PRO` | S21 Pro | `miner-am-s21pro` | `s21pro` |

Import:

```js
const { AM_S19XP, AM_S19XPH, AM_S21, AM_S21PRO } = require('@tetherto/miner-antminer')
```

## Running a mock device

The mock binds an HTTP server that answers Bitmain's native API with canned data. The model `type` parameter controls which response set the mock 
serves (from `mock/initial_states/<type>/`).

Standalone:

```bash
node backend/workers/miners/antminer/mock/server.js --port 14021 --type s19xp
```

Programmatic — this is what the Phase 1 example uses:

```js
const amMock = require('@tetherto/miner-antminer/mock/server')
amMock.createServer({
  port: 14021,
  host: '127.0.0.1',
  type: 's19xp',
  serial: 'AM-001',
  password: 'root'
})
```

| `createServer` option | Type | Default | Notes |
| --- | --- | --- | --- |
| `port` | number | required | TCP port to bind. |
| `host` | string | `'127.0.0.1'` | Interface to bind. |
| `type` | string | required | One of `s19xp`, `s19xp_h`, `s21`, `s21pro`. |
| `serial` | string | required | Serial number reported by the mock. |
| `password` | string | `'root'` | Digest-auth password the mock accepts. |
| `mockControlPort` | number | none | Optional control-plane port for the mock-control-agent. |
| `delay` | number | `0` | Response delay in ms (for latency testing). |
| `error` | boolean | `false` | If true, mock returns error responses. |

The mock control agent (`mock-control-agent.js`) lets tests mutate mock state at runtime; it's documented in code and used by the integration 
tests at [`tests/integration/antminer.test.js`](tests/integration/antminer.test.js).

## Registering a thing

After `startWorker(AM_S19XP, { ork })`, register one or more Antminer devices:

```js
await manager.registerThing({
  info: {
    container: 'site-1',
    serialNum: 'AM-001'
  },
  opts: {
    address: '127.0.0.1',
    port: 14021,
    username: 'root',
    password: 'root'
  }
})
```

| `opts` field | Type | Required | Notes |
| --- | --- | --- | --- |
| `address` | string | yes | Device IP or hostname. |
| `port` | number | yes | HTTP port (real devices typically 80; mocks use the bound port). |
| `username` | string | yes | Digest-auth username. Real Antminer devices default to `root`. |
| `password` | string | yes | Digest-auth password. |

`info` is free-form metadata stored alongside the registration; common fields used by the dashboard are `container`, `serialNum`, `macAddress`, `pos`, 
and `site`. Nothing in `info` affects worker behavior — it travels with the device for downstream consumers.

## Runnable examples

One runnable file per model — each starts an ORK, registers one mock device, and stays running until Ctrl+C. Run from the repo root:

| Model | Example |
| --- | --- |
| S19 XP | [`examples/run-s19xp.js`](examples/run-s19xp.js) |
| S19 XP Hydro | [`examples/run-s19xp_h.js`](examples/run-s19xp_h.js) |
| S21 | [`examples/run-s21.js`](examples/run-s21.js) |
| S21 Pro | [`examples/run-s21pro.js`](examples/run-s21pro.js) |

```bash
node backend/workers/miners/antminer/examples/run-s19xp.js
```

These are the Antminer mirror of [`examples/backend/miners/mdk.client.miner.js`](../../../../examples/backend/miners/mdk.client.miner.js), which uses Whatsminer.

## Capabilities

The full telemetry list (hashrate, power, temperature, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, 
`setLED`, `setupPools`, ...) is in [`mdk-contract.json`](mdk-contract.json). Per-model alert thresholds — hashboard temperature limits, hashrate bounds, 
pool/subaccount mismatches — live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## See also

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide worker install pattern.
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this worker.
- [`docs/concepts/terminology.md`](../../../../docs/concepts/terminology.md) — vocabulary (ORK, worker, manager, thing, mock).
- [`mdk-contract.json`](mdk-contract.json) — runtime contract source of truth.

