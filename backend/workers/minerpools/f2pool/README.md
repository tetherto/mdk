# @tetherto/mdk-worker-f2pool

MDK Worker for the F2Pool Bitcoin mining pool. Fetches hashrate, worker stats, and earnings via the F2Pool REST API.

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-f2pool` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-f2pool` into `node_modules`, so the `require` in the usage example
below resolves with no further step. The [Worker install pattern](../../docs/install-pattern.md) describes
what every Worker package ships and how to run one.

## Usage

The package is a directory-loaded Worker Plugin: [`mdk-contract.json`](mdk-contract.json) at its root plus the
handler files under `src/`, hosted by `WorkerRuntimeV2`. The pool is one logical device whose options name the
accounts to poll. Declare it under `spec.workers` in `mdk.yaml` and `mdk run` boots it, against the mock pool API
when `mock: true` is set:

```yaml
spec:
  workers:
    - name: f2pool
      package: '@tetherto/mdk-worker-f2pool'
      env:
        F2POOL_API_SECRET: ${F2POOL_API_SECRET}
      config:
        mock: true                       # start mock/server.js on the device's port (dev only)
        devices:
          - id: f2pool
            opts: { accounts: [my-f2pool-account], port: 18000 }
```

In your own Node.js process, point `WorkerRuntimeV2` at the package directory with the same device:

```js
const path = require('path')
const { getKernel, dhtFromProject } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-f2pool/package.json')), {
  workerId: 'f2pool-site-1',
  storeDir: './store/f2pool-site-1',
  allowedKeys: [kernel.getClientPublicKey()],
  env: { F2POOL_API_SECRET: process.env.F2POOL_API_SECRET },
  devices: [{ deviceId: 'f2pool-site-1', config: { accounts: ['my-f2pool-account'] } }],
  ...dhtFromProject(projectDir)
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

`dhtFromProject` joins the DHT the rest of the stack is on, reading what `mdk run` resolved from `spec.network.dht`. It returns
`{}` on the public HyperDHT, so it is safe to spread either way. A host that leaves it out always joins the public network, and
on a stack running a private bootstrap the Kernel then never reaches this Worker — its pool data stays missing while every
other component looks healthy. See the [private DHT guide](../../../../docs/guides/deployment/private-dht.md).

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

### Device options

`devices[].opts` in `mdk.yaml`, or the device's `config` in the host:

| Field       | Required | Description                                                                               |
| ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `accounts`  | Yes      | F2Pool mining user names to poll                                                          |
| `apiUrl`    | No       | F2Pool API base URL. Defaults to `https://api.f2pool.com`, or `http://<host>:<port>` when `port` is set |
| `port`      | No       | With `mock: true`, the port the mock pool API listens on; also the default `apiUrl` host port |
| `apiSecret` | No       | Sent as the `F2P-API-SECRET` header when `F2POOL_API_SECRET` is not in the worker `env`  |

`accounts`, `apiUrl` and `apiSecret` can also sit in the worker-level `config` block.

## Telemetry

The stats and worker list are read from the pool once per poll sweep and shared by every channel of it; a pool
that cannot be reached fails the channel with `ERR_POOL_API` instead of answering from a cache. The client waits a
second between API calls to respect F2Pool's rate limit.

| Field                | Unit | Description                                                                 |
| -------------------- | ---- | --------------------------------------------------------------------------- |
| `hashrate`           | H/s  | Latest pool-side hashrate across configured accounts                        |
| `workers_online`     |      | Workers currently known to the pool                                         |
| `balance`            | BTC  | Total income balance across accounts                                        |
| `estimated_earnings` | BTC  | Estimated income for the current day across accounts                        |
| `transactions`       |      | Earnings rows for a range, fetched from the pool in one call per account    |

`transactions` takes these query parameters on a `telemetry.pull`:

| Parameter    | Required | Description                                                                                       |
| ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `start`      | No       | Range start in ms. Without `start` and `end`, the rows that arrived since the last pull without a range (from UTC midnight, on the first such pull after the Worker starts) |
| `end`        | No       | Range end in ms                                                                                   |
| `aggrHourly` | No       | `true` returns one `{ ts, revenue }` row per hour, the range total spread evenly                  |

Each row is an F2Pool revenue transaction with `username`, `ts` (ms), `changed_balance` (BTC) and `mining_extra`,
whose `pps` and `tx_fee` fields give the block subsidy versus transaction fee split of the payout.

The Worker Runtime polls every field above every 300 s (`telemetryPollIntervalMs` in `mdk-contract.json`) and stores the series,
so a fleet read through `mdkClient.pullSnapshot()` or `mdkClient.pullAggregate()` costs no device call. An operator overrides the
interval per instance in `mdk.yaml` under `spec.workers[].config` (`null` turns polling off).

## Protocol

Uses the F2Pool REST API over HTTPS. Authenticated with an API secret in the request headers.

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
f2poolMock.createServer({ port: 18000, host: '127.0.0.1', accounts: ['my-f2pool-account'] })
```

The mock accepts the API secret `secret-key`.

## Errors

| Code                      | Fires when                                                                | Fix                                                       |
| ------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `ERR_ACCOUNTS_REQUIRED`   | The device is declared without a non-empty `accounts` list                | List the F2Pool mining user names                         |
| `ERR_API_SECRET_REQUIRED` | Neither `F2POOL_API_SECRET` in the worker env nor `apiSecret` is set      | Set `F2POOL_API_SECRET`                                   |
| `ERR_POOL_API`            | The F2Pool API call fails, times out or returns a non-2xx status          | Check the secret, `apiUrl` and outbound HTTPS connectivity |
| `ERR_START_INVALID`       | `transactions` is pulled with `end` but no `start`                        | Pass both bounds, or neither for the rows since the last pull without a range (from UTC midnight, on the first such pull after the Worker starts) |
| `ERR_END_INVALID`         | `transactions` is pulled with `start` but no `end`                        | Pass both bounds, or neither for the rows since the last pull without a range (from UTC midnight, on the first such pull after the Worker starts) |
| `ERR_RANGE_INVALID`       | `start` or `end` is not a finite number of ms, or `start` is after `end`  | Pass a valid range                                        |

## Testing

```bash
cd backend/workers/minerpools/f2pool
npm test
```
