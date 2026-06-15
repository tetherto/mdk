# @tetherto/minerpool-ocean

MDK worker for the Ocean.xyz Bitcoin mining pool. Fetches hashrate, worker stats, and earnings via the Ocean REST API.

## Install

```bash
npm install @tetherto/minerpool-ocean
```

## Usage

```js
const { OCEAN } = require('@tetherto/minerpool-ocean')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(OCEAN, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { username: 'my-ocean-account' },
  opts: {
    apiKey: 'your-api-key',
    baseUrl: 'https://api.ocean.xyz/v1'
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

Uses the Ocean REST API over HTTPS. Authenticated with an API key in the request headers.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Mock Server

```js
const oceanMock = require('@tetherto/minerpool-ocean/mock/server')
oceanMock.createServer({ port: 5020, host: '127.0.0.1' })
```

## Testing

```bash
cd backend/workers/minerpools/ocean
npm test
```
