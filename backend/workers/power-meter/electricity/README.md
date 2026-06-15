# @tetherto/tpl-lib-electricity

MDK worker for electricity provider REST APIs. Fetches billing, consumption, and tariff data from utility company APIs. Enables correlation of on-site power meter readings against utility billing data.

## Install

```bash
npm install @tetherto/tpl-lib-electricity
```

## Usage

```js
const { ElectricityProvider } = require('@tetherto/tpl-lib-electricity')
const { startWorker } = require('@tetherto/mdk')

const { manager } = await startWorker(ElectricityProvider, { ork, rack: 'site-1' })

await manager.registerThing({
  info: { accountId: 'utility-account-001', site: 'site-texas-01' },
  opts: { apiKey: 'your-api-key', baseUrl: 'https://api.utility.example.com/v1' }
})
```

## Protocol

HTTPS REST API. Uses `@bitfinex/bfx-facs-http` for connection management.

## Notes

This package is distinct from the hardware Modbus power meter workers. It fetches data from the utility company's billing API rather than a physical device on-site.

## Testing

```bash
cd backend/workers/power-meter/electricity
npm test
```
