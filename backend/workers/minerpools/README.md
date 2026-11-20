# Workers/minerpools

Mining pool API Workers. These Workers connect to mining pool REST APIs and expose pool-level telemetry (hashrate, active workers, balance, earnings) through the MDK Protocol. This allows the fleet operator to correlate on-site device performance with pool-reported stats.

## Packages

| Directory                       | Package                       | Pool   |
| ------------------------------- | ----------------------------- | ------ |
| [`f2pool/`](./f2pool/README.md) | `@tetherto/mdk-worker-f2pool` | F2Pool |

Ocean.xyz support is the manufacturer-maintained [`ocean-mdk-worker`](https://github.com/OCEAN-xyz/mdk-wrk-minerpool-ocean)
contract plugin, listed in [`external-workers.json`](../external-workers.json) and hosted on `WorkerRuntimeV2` (see
[`examples/mvp-site/backend/ocean-adapter.js`](../../../examples/mvp-site/backend/ocean-adapter.js)).

## Common telemetry

All pool Workers report:

| Field                | Unit | Description                            |
| -------------------- | ---- | -------------------------------------- |
| `hashrate`           | TH/s | Pool-reported hashrate for the account |
| `workers_online`     | —    | Number of active worker connections    |
| `balance`            | BTC  | Current unpaid balance                 |
| `estimated_earnings` | BTC  | Estimated daily earnings               |

## Notes on pool Workers

Pool Workers are read-only (no hardware commands). They poll the pool REST API on each telemetry cycle. Unlike device
Workers (miners, containers, power meters), a pool Worker hosts a single logical device whose options name the
accounts to poll (API secret, accounts, base URL); the API secret travels in the Worker's `env`.

Pool Workers do not participate in command dispatch, they only respond to `telemetry.pull`.

## Quickstart

```js
const path = require('path')
const { getKernel } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-f2pool/package.json')), {
  workerId: 'f2pool-site-1',
  storeDir: './store/f2pool-site-1',
  allowedKeys: [kernel.getClientPublicKey()],
  env: { F2POOL_API_SECRET: process.env.F2POOL_API_SECRET },
  devices: [{ deviceId: 'f2pool-site-1', config: { accounts: ['my-pool-account'] } }]
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.
