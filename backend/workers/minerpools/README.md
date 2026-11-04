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
Workers (miners, containers, power meters), a pool Worker hosts a single logical device on `WorkerRuntime` whose
`deviceId` equals the `workerId`. The pool account (API key, accounts, base URL) is configuration passed at boot,
not a `registerThing`-provisioned device. There is no `allowEmptyDevices`/provisioning-first pattern here.

Pool Workers do not participate in command dispatch, they only respond to `telemetry.pull`.

## Quickstart

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startF2poolWorker } = require('@tetherto/mdk-worker-f2pool')

const kernel = await getKernel()

const worker = await startF2poolWorker({
  workerId: 'f2pool-site-1',
  rack: 'site-1',
  storeDir: './store/f2pool-site-1',
  allowedKeys: [kernel.getClientPublicKey()],
  conf: { f2pool: { accounts: ['my-pool-account'], apiSecret: process.env.F2POOL_API_SECRET } }
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.
