# @tetherto/mdk-worker-f2pool

MDK Worker for the F2Pool Bitcoin mining pool. Fetches hashrate, worker stats, and earnings via the F2Pool REST API.

## Install

```bash
npm install @tetherto/mdk-worker-f2pool
```

## Usage

`startF2poolWorker(opts)` boots a single logical device on `WorkerRuntime` — the pool account list is configuration
passed at boot, not a `registerThing`-provisioned device:

```js
const { getKernel } = require('@tetherto/mdk')
const { startF2poolWorker } = require('@tetherto/mdk-worker-f2pool')

const kernel = await getKernel()

const worker = await startF2poolWorker({
  workerId: 'f2pool-site-1',
  rack: 'site-1',
  storeDir: './store/f2pool-site-1',
  conf: { f2pool: { accounts: ['my-f2pool-account'], apiSecret: 'your-api-secret', apiUrl: 'https://api.f2pool.com/v2' } }
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

| `opts` field | Type | Status | Notes |
| --- | --- | --- | --- |
| `workerId` | string | Required | One runtime process = one `workerId`. |
| `rack` | string | Required | Rack identifier; also the pool store prefix. |
| `storeDir` | string | Required | Persistent store directory. |
| `conf.f2pool.accounts` | string[] | Required | F2Pool usernames to poll. |
| `conf.f2pool.apiSecret` | string | Required | Sent as the `F2P-API-SECRET` header. |
| `conf.f2pool.apiUrl` | string | Optional | Defaults to the F2Pool API base URL. |
| `kernelTopic` | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`. |

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate` | TH/s | Pool-reported hashrate for this account |
| `workers_online` | — | Number of active worker connections |
| `balance` | BTC | Current unpaid balance |
| `estimated_earnings` | BTC | Estimated daily earnings |

## Protocol

Uses the F2Pool REST API over HTTPS. Authenticated with an API key in the request headers.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock Server

Run the mock standalone (f2pool has no model `type`):

```bash
npm run mock
```

Programmatic:

```js
const f2poolMock = require('@tetherto/mdk-worker-f2pool/mock/server')
f2poolMock.createServer({ port: 5030, host: '127.0.0.1' })
```

## Testing

```bash
cd backend/workers/minerpools/f2pool
npm test
```
