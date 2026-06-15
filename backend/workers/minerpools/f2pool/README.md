# @tetherto/minerpool-f2pool

MDK worker for the F2Pool Bitcoin mining pool. Fetches hashrate, worker stats, and earnings via the F2Pool REST API.

## Install

```bash
npm install @tetherto/minerpool-f2pool
```

## Usage

```js
const { F2POOL } = require('@tetherto/minerpool-f2pool')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(F2POOL, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { username: 'my-f2pool-account' },
  opts: {
    apiKey: 'your-api-key',
    baseUrl: 'https://api.f2pool.com/v2'
  }
})
```

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

```js
const f2poolMock = require('@tetherto/minerpool-f2pool/mock/server')
f2poolMock.createServer({ port: 5030, host: '127.0.0.1' })
```

## Testing

```bash
cd backend/workers/minerpools/f2pool
npm test
```
