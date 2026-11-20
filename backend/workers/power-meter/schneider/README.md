# @tetherto/mdk-worker-schneider

MDK Worker for Schneider Electric power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports P3U30 and PM5340 models.

## Supported models

| `model` value | Model |
|--------|--------|
| `p3u30` | EasyLogic PM3250 (P3U30) |
| `pm5340` | Acti9 PowerTag / PM5340 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-schneider` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-schneider` into `node_modules`, so the `require` in the usage example
below resolves with no further step. The [Worker install pattern](../../docs/install-pattern.md) describes
what every Worker package ships and how to run one.

## Usage

The package is a directory-loaded Worker Plugin: [`mdk-contract.json`](mdk-contract.json) at its root plus the
handler files under `src/`, hosted by `WorkerRuntimeV2`. Declare it under `spec.workers` in `mdk.yaml` and `mdk run`
boots it, with one mock meter per device when `mock: true` is set:

```yaml
spec:
  workers:
    - name: schneider
      package: '@tetherto/mdk-worker-schneider'
      config:
        mock: true                       # start mock/server.js per device (dev only)
        devices:
          - id: SCHN-001
            opts: { address: 127.0.0.1, port: 15040, unitId: 1, model: pm5340 }
```

In your own Node.js process, point `WorkerRuntimeV2` at the package directory with the same device list:

```js
const path = require('path')
const { getKernel, dhtFromProject } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-schneider/package.json')), {
  workerId: 'schneider-rack-1',
  storeDir: './store/schneider-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'SCHN-001', config: { address: '192.168.1.152', port: 502, unitId: 1, model: 'pm5340' } }],
  ...dhtFromProject(projectDir)
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

`dhtFromProject` joins the DHT the rest of the stack is on, reading what `mdk run` resolved from `spec.network.dht`. It returns
`{}` on the public HyperDHT, so it is safe to spread either way. A host that leaves it out always joins the public network, and
on a stack running a private bootstrap the Kernel then never reaches this Worker — its meters stay missing while every other
component looks healthy. See the [private DHT guide](../../../../docs/guides/deployment/private-dht.md).

The device list is fixed at construction: adding or removing a meter is a config edit and a restart.

There is no boot function and no plugin module to `require()`. The package root exports only the device classes, for a host
that drives a meter without the runtime:

```js
const { SchneiderPowerMeter, P3U30PowerMeter, PM5340PowerMeter } = require('@tetherto/mdk-worker-schneider')
```

### Device options

`devices[].opts` in `mdk.yaml`, or each device's `config` in the host:

| Field     | Required | Description                                                                                          |
| --------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `address` | Yes      | Meter IPv4 address or hostname. `host` is accepted as an alias                                       |
| `port`    | Yes      | Modbus TCP port, `502` on a real meter                                                               |
| `unitId`  | Yes      | Modbus unit ID of the meter on the bus                                                               |
| `model`   | Yes      | One of the `model` values; a legacy `type` tag such as `powermeter-schneider-pm5340` is accepted too |
| `timeout` | No       | Modbus read timeout in milliseconds. Defaults to `10000`                                             |

`model` can also sit in the worker-level `config` block, where every device reads it unless it sets its own. With `mock: true`, keep `model` on the device: the mock reads the same opts and picks its register map from it.

## Protocol

Modbus TCP on port 502 (configurable).

## Telemetry

One Modbus read serves every channel of a poll sweep. A meter that cannot be read fails the channel with an error
code instead of returning a stale value, which is what the runtime's `health` channel reports on.

| Field          | Unit | Description                                                              |
| -------------- | ---- | ------------------------------------------------------------------------ |
| `voltage`      | V    | Average phase-to-phase voltage                                           |
| `current`      | A    | Average phase current (PM5340 only, `0` on P3U30)                        |
| `active_power` | W    | Total active power                                                       |
| `power_factor` |      | Total power factor (PM5340 only, `0` on P3U30)                           |
| `frequency`    | Hz   | Line frequency                                                           |
| `snap`         |      | Full structured snapshot (stats and config), the legacy metrics shape    |

The Worker Runtime polls every field above every 30 s (`telemetryPollIntervalMs` in `mdk-contract.json`) and stores the series,
so a fleet read through `mdkClient.pullSnapshot()` or `mdkClient.pullAggregate()` costs no device call. An operator overrides the
interval per instance in `mdk.yaml` under `spec.workers[].config` (`null` turns polling off).

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

## Errors

| Code                        | Fires when                                                        | Fix                                                        |
| --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `ERR_DEVICE_CONFIG_INVALID` | A device is declared without `address`, `port` or `unitId`        | Complete the device options                                |
| `ERR_MODEL_INVALID`         | `model` (or the `type` tag, or the worker-level default) is not a supported model | Use one of the `model` values              |
| `ERR_METER_UNREACHABLE`     | The Modbus TCP connection fails or times out                      | Check the meter's power, address, port and network path    |
| `ERR_METER_READ_FAILED`     | The meter answers but the register read is invalid or incomplete. On the P3U30 the detail after the code is `ERR_DATA_INVALID` for a frame that is not a Buffer, or `ERR_DATA_INSUFFICIENT` for one under 22 bytes. | Check `unitId` and the meter model                         |

The Worker always passes a Modbus client and both models implement the read, so `ERR_NO_CLIENT` and `ERR_READ_VALUES_NO_IMPL` reach
only a host that builds a device class from [`index.js`](index.js) itself. That host meets the two detail codes without the
`ERR_METER_READ_FAILED` prefix.

## Mock server

Run the mock standalone, with the model `type` as the first argument:

```bash
npm run mock pm5340
```

Programmatic:

```js
const schneiderMock = require('@tetherto/mdk-worker-schneider/mock/server')
const mock = schneiderMock.createServer({ host: '127.0.0.1', port: 15040, type: 'pm5340', powerW: 9000 })
```

The register map is encoded on every read, so editing a value on `mock.state` while the mock runs changes the next reading.

## Testing

```bash
cd backend/workers/power-meter/schneider
npm test
```
