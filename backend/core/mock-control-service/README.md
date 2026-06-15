# @tetherto/mdk-mock-control-service

A Fastify-based mock HTTP server that stands in for real vendor APIs during development and testing. Provides canned responses that mimic the actual hardware control APIs (Whatsminer TCP, Antminer CGMiner, Container REST, pool REST, power meter HTTP) so workers can be exercised without physical hardware.

## Usage

```js
const { createServer } = require('@tetherto/mdk-mock-control-service/mock-control-agent')

// Start a mock Whatsminer M56S on TCP port 14028
const server = createServer({
  port: 14028,
  host: '127.0.0.1',
  type: 'm56s',
  serial: 'WM-001',
  password: 'admin'
})
```

Each worker package also ships its own `mock/server.js` that uses this under the hood. The examples import directly from those:

```js
// From backend/core/examples/mdk-e2e/run.js
const wmMock = require('../../../workers/miners/whatsminer/mock/server')
wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })
```

## Supported Device Types

| Type | Protocol | Default Port | Notes |
|------|----------|-------------|-------|
| Whatsminer M30S/M53S/M56S/M63 | TCP (Whatsminer API) | 14028 | Encrypted token auth |
| Antminer S19XP | HTTP (CGMiner API) | 4028 | Digest auth |
| Avalon A1346 | HTTP | 4028 | |
| Antspace HK3 container | HTTP REST | 18001 | |
| MicroBT container | HTTP REST | 8080 | |
| ABB B23 power meter | HTTP/Modbus | 15001 | |
| SATEC power meter | HTTP/Modbus | 15001 | |
| Schneider power meter | HTTP/Modbus | 15001 | |
| Ocean pool | HTTP REST | 5020 | |
| F2Pool | HTTP REST | 5030 | |
| Seneca sensor | HTTP/Serial | 15501 | |

## `routes.js`

The `routes.js` file contains the Fastify route definitions and canned response data for each device type. You can modify this file to simulate specific error conditions, device states, or unusual metric values during testing.

## In the E2E Examples

The `mdk-e2e` and `mdk-site` examples spin up mock servers automatically before starting workers:

```js
// 10 Whatsminer M56S miners on ports 14100-14109
for (let i = 0; i < 10; i++) {
  wmMock.createServer({ port: 14100 + i, host: '127.0.0.1', type: 'm56s', serial: `WM-${i}`, password: 'admin' })
}
```

This lets the full stack run end-to-end on a developer laptop without any physical hardware.

## Testing

```bash
cd backend/core/mock-control-service
npm test
```
