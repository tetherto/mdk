# @tetherto/mdk-worker-abb

MDK Worker for ABB power meters. Reads 3-phase electrical measurements via Modbus TCP. Supports B23, B24, M1M20, M4M20, and REU615 models.

## Supported models

| `model` value | Model |
|--------|--------|
| `b23` | ABB B23 |
| `b24` | ABB B24 |
| `m1m20` | ABB M1M20 |
| `m4m20` | ABB M4M20 |
| `reu615` | ABB REU615 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-abb` returns `E404`. The device Workers are not published to npm; they are
> workspace packages in the public MDK repository. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-abb` into `node_modules`, so the `require` in the usage example
below resolves with no further step. The [Worker install pattern](../../docs/install-pattern.md) describes
what every Worker package ships and how to run one.

## Usage

The package is a directory-loaded Worker Plugin: [`mdk-contract.json`](mdk-contract.json) at its root plus the
handler files under `src/`, hosted by `WorkerRuntimeV2`. Declare it under `spec.workers` in `mdk.yaml` and `mdk run`
boots it, with one mock meter per device when `mock: true` is set:

```yaml
spec:
  workers:
    - name: abb
      package: '@tetherto/mdk-worker-abb'
      config:
        mock: true                       # start mock/server.js per device (dev only)
        devices:
          - id: ABB-001
            opts: { address: 127.0.0.1, port: 15030, unitId: 0, model: b23 }
```

In your own Node.js process, point `WorkerRuntimeV2` at the package directory with the same device list:

```js
const path = require('path')
const { getKernel, dhtFromProject } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-abb/package.json')), {
  workerId: 'abb-rack-1',
  storeDir: './store/abb-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'ABB-001', config: { address: '192.168.1.150', port: 502, unitId: 1, model: 'b23' } }],
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
const { ABBPowerMeter, B2XPowerMeter, M1M20PowerMeter, M4M20PowerMeter, REU615PowerMeter } = require('@tetherto/mdk-worker-abb')
```

### Device options

`devices[].opts` in `mdk.yaml`, or each device's `config` in the host:

| Field              | Required | Description                                                                                  |
| ------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `address`          | Yes      | Meter IPv4 address or hostname. `host` is accepted as an alias                               |
| `port`             | Yes      | Modbus TCP port, `502` on a real meter                                                       |
| `unitId`           | Yes      | Modbus unit ID of the meter on the bus                                                       |
| `model`            | Yes      | One of the `model` values; a legacy `type` tag such as `powermeter-abb-b23` is accepted too  |
| `timeout`          | No       | Modbus read timeout in milliseconds. Defaults to `10000`                                     |
| `conf.cacheLimit`  | No       | Failed reads the meter may bridge from its last good snapshot. Defaults to `0`               |

`model` and `conf` can also sit in the worker-level `config` block, where every device reads them unless it sets its own. With `mock: true`, keep `model` on the device: the mock reads the same opts and picks its register map from it.

## Protocol

Modbus TCP on port 502 (configurable). The `unitId` identifies the specific meter on a shared Modbus network.

## Telemetry

One Modbus read serves every channel of a poll sweep. A meter that cannot be read fails the channel with an error
code instead of returning a stale value, which is what the runtime's `health` channel reports on.

| Field            | Unit | Description                                                              |
| ---------------- | ---- | ------------------------------------------------------------------------ |
| `voltage_v1`     | V    | Phase 1 voltage                                                          |
| `voltage_v2`     | V    | Phase 2 voltage                                                          |
| `voltage_v3`     | V    | Phase 3 voltage                                                          |
| `current_i1`     | A    | Phase 1 current                                                          |
| `current_i2`     | A    | Phase 2 current                                                          |
| `current_i3`     | A    | Phase 3 current                                                          |
| `active_power`   | W    | Total active (real) power                                                |
| `reactive_power` | VAR  | Total reactive power                                                     |
| `snap`           |      | Full structured snapshot (stats and config), the legacy metrics shape    |

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
| `ERR_METER_READ_FAILED`     | The meter answers but the register read is invalid or incomplete  | Check `unitId` and the meter model                         |

The Worker always passes a Modbus client, so `ERR_NO_CLIENT` reaches only a host that builds a device class from
[`index.js`](index.js) itself.

## Mock server

Run the mock standalone, with the model `type` as the first argument (case-insensitive):

```bash
npm run mock b23
```

Programmatic:

```js
const abbMock = require('@tetherto/mdk-worker-abb/mock/server')
abbMock.createServer({ host: '127.0.0.1', port: 502, type: 'B23' })
```

## Testing

```bash
cd backend/workers/power-meter/abb
npm test
```
