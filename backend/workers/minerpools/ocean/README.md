# @tetherto/mdk-worker-ocean

MDK Worker for the Ocean.xyz Bitcoin mining pool. Fetches hashrate, worker stats, and earnings via the Ocean REST API.

## Install

```bash
npm install @tetherto/mdk-worker-ocean
```

## Usage

`startOceanPoolWorker(opts)` boots a single logical device on `WorkerRuntime` — the pool account list is configuration
passed at boot, not a `registerThing`-provisioned device:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startOceanPoolWorker } = require('@tetherto/mdk-worker-ocean')

const kernel = await getKernel()

const worker = await startOceanPoolWorker({
  workerId: 'ocean-site-1',
  rack: 'site-1',
  storeDir: './store/ocean-site-1',
  conf: { ocean: { accounts: ['my-ocean-account'], apiUrl: 'https://api.ocean.xyz' } }
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `workerId` | Required | `string` | None | One runtime process = one `workerId` |
| `rack` | Required | `string` | None | Rack identifier; also the pool store prefix |
| `storeDir` | Required | `string` | None | Persistent store directory |
| `conf.ocean.accounts` | Required | `string[]` | None | Ocean.xyz usernames to poll |
| `conf.ocean.apiUrl` | Optional | `string` | None; requests target an empty base URL if omitted | The Ocean.xyz API base URL; [`config/ocean.json.example`](config/ocean.json.example) ships `https://api.ocean.xyz` as a template value, not a code-level default |
| `kernelTopic` | Optional | `string` | None | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()` |

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate` | TH/s | Pool-reported hashrate for this account |
| `workers_online` | — | Number of active worker connections |
| `balance` | BTC | Current unpaid balance |
| `estimated_earnings` | BTC | Estimated daily earnings |

## Protocol

Uses the Ocean REST API over HTTPS. Authenticated with an API key in the request headers.

## Multi-account resilience

Each `conf.ocean.accounts` entry is polled independently. An unknown or inactive account returns an error body with
no result; the Worker logs it and skips that account rather than failing the whole stats cycle. Other accounts in
the list still report normally.

## Errors

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_WORKER_ID_REQUIRED` | `opts.workerId` is missing from `startOceanPoolWorker(opts)` | Pass a `workerId` |
| `ERR_RACK_REQUIRED` | `opts.rack` is missing | Pass a `rack` |
| `ERR_STORE_DIR_REQUIRED` | `opts.storeDir` is missing | Pass a `storeDir` |
| `ERR_POOL_REQUIRED` | The Worker Plugin's `connect` runs without a `pool` service already attached — an internal wiring failure, since `startOceanPoolWorker` always supplies one | Not user-facing; check the plugin wiring in [`boot.js`](plugin/boot.js) |
| `ERR_STATS_FETCH` | An account's earnings or hash rate request to the Ocean.xyz API fails, including the case where the response is missing earnings or hash rate data. A yearly-balances failure is handled separately (`ERR_BALANCES_FETCH`) and never reaches this path. | Logged and that account skipped for the cycle; check the account name, or ignore if the account is intentionally paused |
| `ERR_ACCOUNT_DATA_MISSING` | An account's earnings or hash rate response comes back empty | Surfaces as `ERR_STATS_FETCH` in the log, since the same catch handles both; the pool is likely still onboarding that account |
| `ERR_WORKERS_FETCH` | The per-account worker list request to the Ocean.xyz API fails | Logged; that account contributes no workers to `workers_online` for the cycle |
| `ERR_BALANCES_FETCH` | A monthly earnings request to the Ocean.xyz API fails while building the yearly balance history | Logged; that month's balance is recorded as `0` rather than left stale |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock server

Run the mock standalone (ocean has no model `type`):

```bash
npm run mock
```

Programmatic:

```js
const oceanMock = require('@tetherto/mdk-worker-ocean/mock/server')
oceanMock.createServer({ port: 5020, host: '127.0.0.1' })
```

## Testing

```bash
cd backend/workers/minerpools/ocean
npm test
```
