# workers/minerpools

Mining pool API workers. These workers connect to mining pool REST APIs and expose pool-level telemetry (hashrate, active workers, balance, earnings) through the MDK Protocol. This allows the fleet operator to correlate on-site device performance with pool-reported stats.

## Packages

| Directory | Package | Pool |
|-----------|---------|------|
| [`base/`](./base/) | `@tetherto/tpl-lib-pool` | `PoolManager` — base class for pool workers |
| [`ocean/`](./ocean/README.md) | `@tetherto/minerpool-ocean` | Ocean.xyz (ocean-btc) |
| [`f2pool/`](./f2pool/README.md) | `@tetherto/minerpool-f2pool` | F2Pool (f2pool-btc) |

## Common Telemetry

All pool workers report:

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate` | TH/s | Pool-reported hashrate for the account |
| `workers_online` | — | Number of active worker connections |
| `balance` | BTC | Current unpaid balance |
| `estimated_earnings` | BTC | Estimated daily earnings |

## Notes on Pool Workers

Pool workers are read-only (no hardware commands). They poll the pool REST API on each telemetry cycle. Each registered "thing" represents a pool account (identified by username/API key), not a physical device.

Pool workers do not participate in command dispatch — they only respond to `telemetry.pull`.

## Quick Start

```js
const { OCEAN } = require('@tetherto/minerpool-ocean')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(OCEAN, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { username: 'my-pool-account' },
  opts: { apiKey: 'xxxx', baseUrl: 'https://api.ocean.xyz/v1' }
})
```
