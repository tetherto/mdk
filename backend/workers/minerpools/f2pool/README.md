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
const { getKernel } = require('@tetherto/mdk-core')
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

| Option                  | Status   | Type       | Default | Description                                                        |
| ----------------------- | -------- | ---------- | ------- | ------------------------------------------------------------------ |
| `workerId`              | Required | `string`   | None    | One runtime process = one `workerId`                               |
| `rack`                  | Required | `string`   | None    | Rack identifier; also the pool store prefix                        |
| `storeDir`              | Required | `string`   | None    | Persistent store directory                                         |
| `conf.f2pool.accounts`  | Required | `string[]` | None    | F2Pool usernames to poll                                           |
| `conf.f2pool.apiSecret` | Required | `string`   | None    | Sent as the `F2P-API-SECRET` header                                |
| `conf.f2pool.apiUrl`    | Optional | `string`   | None; requests target an empty base URL if omitted | The F2Pool API base URL; [`config/f2pool.json.example`](config/f2pool.json.example) ships `https://api.f2pool.com/v2` as a template value, not a code-level default |
| `kernelTopic`           | Optional | `string`   | None    | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()` |

## Telemetry

| Field                | Unit | Description                             |
|----------------------|------|-----------------------------------------|
| `hashrate`           | TH/s | Pool-reported hashrate for this account |
| `workers_online`     | —    | Number of active worker connections     |
| `balance`            | BTC  | Current unpaid balance                  |
| `estimated_earnings` | BTC  | Estimated daily earnings                |

## Protocol

Uses the F2Pool REST API over HTTPS. Authenticated with an API key in the request headers.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock server

Run the mock standalone (f2pool has no model `type`):

```bash
npm run mock
```

Programmatic:

```js
const f2poolMock = require('@tetherto/mdk-worker-f2pool/mock/server')
f2poolMock.createServer({ port: 5030, host: '127.0.0.1' })
```

## Errors

| Code                     | Fires when                                          | Fix                                                  |
| ------------------------ | --------------------------------------------------- | ---------------------------------------------------- |
| `ERR_POOL_REQUIRED`      | A device is connected without `config.pool`         | Provide the `pool` account name in the device config |
| `ERR_RACK_REQUIRED`      | The boot function is called without `opts.rack`     | Pass a `rack` to the boot function                   |
| `ERR_STORE_DIR_REQUIRED` | The boot function is called without `opts.storeDir` | Pass a `storeDir` path to the boot function          |
| `ERR_WORKER_ID_REQUIRED` | The boot function is called without `opts.workerId` | Pass a `workerId` to the boot function               |

## Testing

```bash
cd backend/workers/minerpools/f2pool
npm test
```
