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
const { getKernel } = require('@tetherto/mdk')
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

| `opts` field | Type | Status | Notes |
| --- | --- | --- | --- |
| `workerId` | string | Required | One runtime process = one `workerId`. |
| `rack` | string | Required | Rack identifier; also the pool store prefix. |
| `storeDir` | string | Required | Persistent store directory. |
| `conf.ocean.accounts` | string[] | Required | Ocean.xyz usernames to poll. |
| `conf.ocean.apiUrl` | string | Optional | Defaults to the Ocean.xyz API base URL. |
| `kernelTopic` | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`. |

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate` | TH/s | Pool-reported hashrate for this account |
| `workers_online` | — | Number of active worker connections |
| `balance` | BTC | Current unpaid balance |
| `estimated_earnings` | BTC | Estimated daily earnings |

## Protocol

Uses the Ocean REST API over HTTPS. Authenticated with an API key in the request headers.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock Server

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
