# workers/minerpools

Mining pool API Workers. These Workers connect to mining pool REST APIs and expose pool-level telemetry (hashrate, active workers, balance, earnings) through the MDK Protocol. This allows the fleet operator to correlate on-site device performance with pool-reported stats.

## Packages

| Directory | Package | Pool |
|-----------|---------|------|
| [`ocean/`](./ocean/README.md) | `@tetherto/mdk-worker-ocean` | Ocean.xyz |
| [`f2pool/`](./f2pool/README.md) | `@tetherto/mdk-worker-f2pool` | F2Pool |

## Common Telemetry

All pool Workers report:

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate` | TH/s | Pool-reported hashrate for the account |
| `workers_online` | — | Number of active worker connections |
| `balance` | BTC | Current unpaid balance |
| `estimated_earnings` | BTC | Estimated daily earnings |

## Notes on Pool Workers

Pool Workers are read-only (no hardware commands). They poll the pool REST API on each telemetry cycle. Unlike device
Workers (miners, containers, power meters), a pool Worker hosts a single logical device on `WorkerRuntime` whose
`deviceId` equals the `workerId` — the pool account (API key, accounts, base URL) is configuration passed at boot,
not a `registerThing`-provisioned device. There is no `allowEmptyDevices`/provisioning-first pattern here.

Pool Workers do not participate in command dispatch — they only respond to `telemetry.pull`.

## Quick Start

```js
const { getKernel } = require('@tetherto/mdk')
const { startOceanPoolWorker } = require('@tetherto/mdk-worker-ocean')

const kernel = await getKernel()

const worker = await startOceanPoolWorker({
  workerId: 'ocean-site-1',
  rack: 'site-1',
  storeDir: './store/ocean-site-1',
  conf: { ocean: { accounts: ['my-pool-account'], apiUrl: 'https://api.ocean.xyz/v1' } }
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```
