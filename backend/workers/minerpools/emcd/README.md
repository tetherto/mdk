# @tetherto/mdk-worker-emcd

MDK worker for the EMCD Bitcoin mining pool. It reads hashrate, active
workers, mining balance, earnings and payout history for one or more accounts
through EMCD Pool API v1.

## Install and test

Use Node.js 24 or later and npm 11. From the repository root:

```bash
npm run setup:workers
npm test --workspace @tetherto/mdk-worker-emcd
node examples/backend/minerpools/emcd/index.js
```

The tests run against a local HTTP mock and a local DHT test network, so they
need no EMCD credentials. The
[example](../../../../examples/backend/minerpools/emcd/README.md) also ships
an opt-in script that checks a real key against the production API.

## Usage

`startEmcdWorker` boots one pool device on `WorkerRuntime`. The device ID is
the `workerId`, and every configured account reports through that one device.

```js
const { startEmcdWorker } = require('@tetherto/mdk-worker-emcd')

async function main () {
  const worker = await startEmcdWorker({
    workerId: 'emcd-site-1',
    rack: 'site-1',
    storeDir: './store/emcd-site-1',
    conf: {
      emcd: {
        apiKey: process.env.EMCD_API_KEY,
        apiSecret: process.env.EMCD_API_SECRET,
        accounts: []
      }
    }
  })

  // Register this public key with your Kernel.
  console.log(worker.runtime.getPublicKey().toString('hex'))
  process.once('SIGINT', () => worker.stop())
  process.once('SIGTERM', () => worker.stop())
}

main().catch(console.error)
```

The package also exports `plugin` and the `EMCD_POOL` manager class. In the
MDK service bootstrap the worker is called `minerpool-emcd`.

| Boot option | Required | Meaning |
| --- | --- | --- |
| `workerId` | Yes | Unique runtime and device ID |
| `rack` | Yes | Rack identifier, used as the store prefix |
| `storeDir` | Yes | Directory for the persistent store |
| `conf.emcd` | Yes | API settings, see below |
| `root` | No | Directory holding an optional `config/emcd.json` overlay |
| `kernelTopic` | No | Kernel discovery topic as hex |
| `bootstrap` | No | DHT bootstrap list for a private or test network |

| API setting | Default | Meaning |
| --- | --- | --- |
| `apiUrl` | see below | Base URL including the version path |
| `apiKey` | Required | EMCD API key |
| `apiSecret` | Required | Secret that signs each request |
| `coin` | `btc` | Only Bitcoin is supported. Any other value fails `init()` |
| `accounts` | `[]` | Subaccount IDs you own. Empty means the master account |

The default `apiUrl` is `https://endpoint.emcd.io/pool/v1`.

An explicit account list selects only those subaccounts and does not add the
master account. `init()` rejects duplicate or empty IDs. Keep the key and
secret in an ignored local config file or in environment variables.

The key needs read access to hashrate, workers, earnings and payouts. The
balance endpoint also needs the `master:read:balance` permission. Check that
the key's role has it on your deployment, otherwise balance stays unavailable
(see below).

## Telemetry

| Metric | Unit | Source |
| --- | --- | --- |
| `hashrate` | H/s | Sum of `currHr` from `/hashrate` |
| `workers_online` | Count | Workers with `active === 1` |
| `balance` | BTC | `balance` from `/balance`. Excludes blocked payouts |
| `estimated_earnings` | BTC | Earnings for the previous UTC day |

EMCD publishes earnings once per completed day, so the previous UTC day stands
in for today's estimate. An empty ledger for that day gives zero. The worker
walks every page of the ledger and adds up the rows for that day, including
rows that landed on different pages.

Statistics refresh every minute and the worker list every five minutes. If a
poll is still running when the next tick fires, the tick joins the running
poll instead of starting another. Metric handlers answer `E_POOL_API` until
the first successful poll, after a failed poll, and whenever the snapshot is
older than three minutes. A failed poll keeps the previous snapshot in memory
so you can inspect it.

The `stats` extension carries the per-account values. `unsettled` is always
`null` because the API does not expose pending payouts. `yearlyBalances` holds
monthly payout totals for the current month and the eleven before it, cached
for an hour per account. Rejected hashrate goes into the legacy
`hashrate_stale_*` fields in H/s. Per-worker records have no rejected
hashrate, because the workers endpoint gives only a reject percentage without
matching hourly and daily rates.

Amounts become JavaScript numbers at the MDK boundary. Treat them as
telemetry, not as figures for accounting or transaction signing.

### When balance is unavailable

`/balance` answers 403 when the key lacks `master:read:balance` and 404 when
the deployment does not have the endpoint yet. In both cases the worker logs
one warning, records `balance` as `null` and keeps the other metrics live. The
balance metric answers `E_POOL_API`. The worker retries on every poll and
picks the value up as soon as the permission or the endpoint appears.

The worker never derives balance from earnings minus payouts, because funds
can also move to a wallet, and it never substitutes zero. A 401, a server
error or a malformed body fails the whole poll rather than counting as a
missing endpoint.

## Payout history

The daily job runs at midnight UTC and stores the payouts of the day that just
ended. Each record has the account ID, the transaction ID when EMCD supplies
one, the amount in BTC and the time in Unix seconds. The API does not return
payout addresses.

The F2Pool and Ocean workers key daily records by the host's local midnight.
This worker keys them by UTC midnight, because the EMCD ledger reports
earnings per UTC day. On a host that runs in UTC all three behave the same.

`getWrkExtData({ query: { key: 'transactions', start, end } })` reads these
records with millisecond bounds. `aggrHourly` throws, because the base
service's hourly aggregation expects mining revenue in `satoshis_net_earned`
and EMCD payouts do not carry it. Monthly payout totals are a separate
series from balance and from earnings.

## Authentication and requests

Every GET carries a hex signature:

```text
HMAC-SHA256(apiSecret, apiKey + timestamp + subaccountId)
```

`timestamp` is Unix time in seconds and the body is empty. The worker sends
`X-API-Key`, `X-Timestamp` and `X-Signature`, plus `X-Subaccount-ID` when a
subaccount is selected. On a 401 the worker makes one unsigned call to
`/time`, adjusts its clock offset and retries once. A second 401 surfaces as
`ERR_EMCD_AUTH`.

All calls, including retries and history pages, go through one queue that
spaces them at least 1.1 seconds apart. That keeps a single worker under the
API limit of 60 requests per minute. If several processes share one outbound
IP, they share that budget too, and nothing in the worker coordinates them.
Long account lists and long payout histories stretch a poll accordingly.
Requests time out after 30 seconds and abort when the worker stops. Signed
requests do not follow redirects. Error messages carry no response bodies and
no authentication headers.

## Health and troubleshooting

The contract declares `OK`, `DEGRADED` and `OFFLINE`, plus
`alert.pool_unreachable` and `alert.hashrate_low`, same as the other pool
workers. The runtime health ping only says whether the process is reachable.
It does not call the EMCD API, so watch the metric errors and the poll log for
API trouble.

`ERR_EMCD_AUTH` means the key or secret is wrong. HTTP 403 means the key lacks
a permission or the subaccount is not yours. `E_POOL_API` means the last poll
failed or the snapshot is stale, so look at the poll log first. Before
escalating low hashrate, compare it with what the miners themselves report.

## Mock

```bash
npm run mock --workspace @tetherto/mdk-worker-emcd
```

The mock listens on `127.0.0.1:5065` and serves the `/pool/v1` routes. It
verifies the HMAC signature, the account scope and the 30-second timestamp
window. The test credentials in `mock/lib/test-keys.js` are public fixtures and
do not work against EMCD. In tests, `createServer({ port: 0 })` picks a free
port and returns the server handle. The options `accounts`, `clockOffsetMs`
and `balanceStatus` (200, 403 or 404) shape the mock's behaviour.
