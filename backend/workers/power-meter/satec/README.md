# @tetherto/mdk-worker-satec

MDK Worker for SATEC power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports the PM180 model.

## Supported models

| `model` value | Model |
|--------|-------|
| `pm180` | SATEC PM180 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-satec` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-satec` into `node_modules`, so the `require` in the usage example
below resolves with no further step. The [Worker install pattern](../../docs/install-pattern.md) describes
what every Worker package ships and how to run one.

## Usage

The package is a directory-loaded Worker Plugin: [`mdk-contract.json`](mdk-contract.json) at its root plus the
handler files under `src/`, hosted by `WorkerRuntimeV2`. Declare it under `spec.workers` in `mdk.yaml` and `mdk run`
boots it, with one mock meter per device when `mock: true` is set:

```yaml
spec:
  workers:
    - name: satec
      package: '@tetherto/mdk-worker-satec'
      config:
        mock: true                       # start mock/server.js per device (dev only)
        devices:
          - id: SATEC-001
            opts: { address: 127.0.0.1, port: 15020, unitId: 1 }
```

In your own Node.js process, point `WorkerRuntimeV2` at the package directory with the same device list:

```js
const path = require('path')
const { getKernel, dhtFromProject } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-satec/package.json')), {
  workerId: 'satec-rack-1',
  storeDir: './store/satec-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'SATEC-001', config: { address: '192.168.1.151', port: 502, unitId: 1 } }],
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

There is no boot function and no plugin module to `require()`. The package root exports only the device class, for a host
that drives a meter without the runtime:

```js
const { SatecPowerMeter } = require('@tetherto/mdk-worker-satec')
```

### Device options

`devices[].opts` in `mdk.yaml`, or each device's `config` in the host:

| Field               | Required | Description                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------------- |
| `address`           | Yes      | Meter IPv4 address or hostname. `host` is accepted as an alias               |
| `port`              | Yes      | Modbus TCP port, `502` on a real meter                                       |
| `unitId`            | Yes      | Modbus unit ID of the meter on the bus                                       |
| `timeout`           | No       | Modbus read timeout in milliseconds. Defaults to `10000`                     |
| `collectSnapsItvMs` | No       | Interval the 15-minute power average is sized for. Defaults to `60000`       |

`collectSnapsItvMs` can also sit in the worker-level `config` block, where every device reads it.

## Protocol

Modbus TCP on port 502 (configurable).

## Telemetry

One Modbus read serves every channel of a poll sweep. A meter that cannot be read fails the channel with an error
code instead of returning a stale value, which is what the runtime's `health` channel reports on.

| Field          | Unit | Description                                                              |
| -------------- | ---- | ------------------------------------------------------------------------ |
| `voltage`      | V    | Average phase-to-phase voltage                                           |
| `current`      | A    | Average phase current                                                    |
| `active_power` | W    | Real import power                                                        |
| `power_factor` |      | Average phase power factor (0 to 1)                                      |
| `frequency`    | Hz   | Always `0`: the PM180 register map read by this Worker has no frequency  |
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
| `ERR_METER_UNREACHABLE`     | The Modbus TCP connection fails or times out                      | Check the meter's power, address, port and network path    |
| `ERR_METER_READ_FAILED`     | The meter answers but the register read is invalid or incomplete. The detail after the code is `ERR_DATA_INVALID` for a frame that is not a Buffer, or `ERR_DATA_INSUFFICIENT` for one under 38 bytes. | Check `unitId` and the meter model                         |

The Worker always passes a Modbus client, so `ERR_NO_CLIENT` reaches only a host that builds a device class from
[`index.js`](index.js) itself. That host meets the two detail codes without the `ERR_METER_READ_FAILED` prefix.

## Mock server

Run the mock standalone:

```bash
npm run mock pm180
```

Programmatic:

```js
const satecMock = require('@tetherto/mdk-worker-satec/mock/server')
const mock = satecMock.createServer({ host: '127.0.0.1', port: 15020, type: 'pm180', powerW: 17000 })
```

`powerW` seeds the real import power register. The register map is encoded on every read, so editing a value on
`mock.state` while the mock runs (for example `mock.state[276].value`) changes the next reading.

## Testing

```bash
cd backend/workers/power-meter/satec
npm test
```
