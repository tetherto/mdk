# @tetherto/mdk-worker-avalon

MDK Worker for Canaan Avalon Bitcoin miners. Supports the A1346 family.

## Supported models

| `model` value | Model |
|--------|-------|
| `a1346` | Avalon A1346 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-avalon` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-avalon` into `node_modules`, so the `require` in the usage example
below resolves with no further step. The [Worker install pattern](../../docs/install-pattern.md) describes
what every Worker package ships and how to run one.

## Usage

The package is a directory-loaded Worker Plugin: [`mdk-contract.json`](mdk-contract.json) at its root plus the
handler files under `src/`, hosted by `WorkerRuntimeV2`. Declare it under `spec.workers` in `mdk.yaml` and `mdk run`
boots it, with one mock miner per device when `mock: true` is set:

```yaml
spec:
  workers:
    - name: avalon
      package: '@tetherto/mdk-worker-avalon'
      config:
        mock: true                       # start mock/server.js per device (dev only)
        devices:
          - id: AV-001
            opts: { address: 127.0.0.1, port: 14030, password: admin, type: miner-av-a1346 }
```

In your own Node.js process, point `WorkerRuntimeV2` at the package directory with the same device list:

```js
const path = require('path')
const { getKernel, dhtFromProject } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
  workerId: 'avalon-rack-3',
  storeDir: './store/avalon-rack-3',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'AV-001', config: { address: '192.168.1.30', port: 4028, password: 'admin' } }],
  ...dhtFromProject(projectDir)
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

`dhtFromProject` joins the DHT the rest of the stack is on, reading what `mdk run` resolved from `spec.network.dht`. It returns
`{}` on the public HyperDHT, so it is safe to spread either way. A host that leaves it out always joins the public network, and
on a stack running a private bootstrap the Kernel then never reaches this Worker — its miners stay missing while every other
component looks healthy. See the [private DHT guide](../../../../docs/guides/deployment/private-dht.md).

The device list is fixed at construction: adding or removing a miner is a config edit and a restart. [USAGE.md](USAGE.md)
has the full option reference and the mock.

### Device options

`devices[].opts` in `mdk.yaml`, or each device's `config` in the host:

| Field                   | Required | Description                                                                              |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `address`               | Yes      | Miner IPv4 address or hostname. `host` is accepted as an alias                           |
| `password`              | Yes      | Required by the Worker's own validation; the CGMiner wire protocol does not authenticate |
| `port`                  | No       | CGMiner API port. Defaults to `4028`                                                     |
| `type`                  | No       | Device type tag. Defaults to `miner-av-a1346`; resolves the rated W/TH for `snap`        |
| `nominalEfficiencyWThs` | No       | Overrides the rated efficiency table                                                     |
| `timeout`               | No       | Per-request timeout in milliseconds. Defaults to `10000`                                 |
| `conf.pools`            | No       | Pools `setupPools` applies when called without `pools`                                   |

`type`, `conf` and `pools` can also sit in the worker-level `config` block, where every device reads them unless it sets its own.

## Protocol

Avalon uses the native CGMiner TCP API on port 4028 (unauthenticated) and supports fan control, clock tuning, and pool reconfiguration through the same API.

> [!WARNING]
> The CGMiner API is plain TCP. Pool credentials and the miner admin password cross the network unencrypted, so keep
> miners and the Worker on an isolated management network.

The Worker rejects any command parameter (pool URL, pool worker name, password, IP, DNS, fan speed) that contains `,`, `|` or
a control character, before it sends anything to the miner.

## Telemetry

The `stats` and `estats` API calls are made once per poll sweep and shared by every channel. A miner that cannot be
reached fails the channel with an error code instead of returning a stale value.

| Field          | Unit | Description                                                              |
| -------------- | ---- | ------------------------------------------------------------------------ |
| `hashrate_avg` | TH/s | Average hashrate                                                         |
| `power`        | W    | Current power draw                                                       |
| `temperature`  | C    | Average chip temperature                                                 |
| `fan_speed`    | RPM  | Average fan speed                                                        |
| `status`       |      | `mining` or `sleeping`                                                   |
| `uptime`       | s    | Seconds since last boot                                                  |
| `efficiency`   | W/TH | Power efficiency                                                         |
| `power_mode`   |      | `sleep`, `normal` or `high`                                              |
| `snap`         |      | Full structured snapshot (stats and config), the legacy metrics shape    |

The Worker Runtime polls every field above every 60 s (`telemetryPollIntervalMs` in `mdk-contract.json`) and stores the series,
so a fleet read through `mdkClient.pullSnapshot()` or `mdkClient.pullAggregate()` costs no device call. An operator overrides the
interval per instance in `mdk.yaml` under `spec.workers[].config` (`null` turns polling off).

## Commands

| Command        | Parameters         | Description                                                            |
| -------------- | ------------------ | ---------------------------------------------------------------------- |
| `reboot`       |                    | Restart the miner (fire-and-forget: a rebooting miner never answers)   |
| `setPowerMode` | `mode: string`     | `sleep`, `normal` or `high` (fire-and-forget, the miner reboots)       |
| `setLED`       | `enabled: boolean` | Toggle the locate LED                                                  |
| `setupPools`   | `pools: object`    | Configure pools; without `pools`, applies the configured `conf.pools`  |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Errors

| Code                        | Fires when                                                                                 | Fix                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `ERR_DEVICE_CONFIG_INVALID` | A device is declared without `address` or `password`                                       | Complete the device options                             |
| `ERR_MINER_UNREACHABLE`     | The CGMiner API connection fails or times out                                              | Check the miner's power, address, port and network path |
| `ERR_MINER_READ_FAILED`     | The miner answers but the response cannot be read                                          | Check the firmware version                              |
| `ERR_INVALID_MODE`          | `setPowerMode` is called with a mode other than `sleep`, `normal` or `high`                | Pass a supported mode                                   |
| `ERR_SET_POWER_MODE_INVALID` | `validateWriteAction()` checks a `setPowerMode` action whose mode is not `sleep`, `normal` or `high` | Pass a supported mode                                   |
| `ERR_INVALID_ARG_TYPE`      | `setLED` reaches the device with an `enabled` value that is not a boolean                  | Pass `enabled` as `true` or `false`                     |
| `ERR_COMMAND_ARG_INVALID`   | A pool, password, network or fan-speed parameter contains `,`, `\|` or a control character | Remove the character; the CGMiner API cannot carry it   |

## Testing

```bash
cd backend/workers/miners/avalon
npm test
```
