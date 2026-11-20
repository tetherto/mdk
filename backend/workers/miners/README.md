# Workers/miners

Bitcoin ASIC miner Workers. Each package is a directory-loaded Worker Plugin, an `mdk-contract.json` at its root plus
the handler files it names, hosted by [`WorkerRuntimeV2`][mdk-worker-runtime-v2].

## Packages

| Directory | Package | Models |
|-----------|---------|--------|
| [`avalon/`](./avalon/README.md) | `@tetherto/mdk-worker-avalon` | A1346 and variants |

Antminer and Whatsminer are partner-maintained, not shipped here — see [Run an Antminer Worker][run-antminer-worker]
and [Run a Whatsminer Worker][run-whatsminer-worker] for how they're hosted.

## Package shape

Every package here follows the same layout. `WorkerRuntimeV2` loads it by directory, so there is no boot function or
plugin module to `require()`:

```text
miners/<vendor>/
  mdk-contract.json    # the telemetry fields, commands, health states and errors the Worker serves
  src/
    device.js          # builds one device's driver from its config, once per device
    telemetry/*.js     # one handler per telemetry field
    commands/*.js      # one handler per command
  lib/                 # the vendor device driver, the package's only export
  mock/                # a standalone mock of the vendor's native API
```

## Common telemetry fields

Every miner Worker shipped here declares these telemetry fields; its `mdk-contract.json` is the full list:

| Field          | Unit | Description                                 |
|----------------|------|---------------------------------------------|
| `hashrate_avg` | TH/s | Average hashrate                            |
| `power`        | W    | Current power draw                          |
| `temperature`  | C    | Average chip temperature                    |
| `fan_speed`    | RPM  | Average fan speed                           |
| `status`       |      | Device status                               |
| `uptime`       | s    | Seconds since last boot                     |
| `efficiency`   | W/TH | Power efficiency                            |
| `power_mode`   |      | Current power mode                          |
| `snap`         |      | Full structured snapshot (stats and config) |

## Common commands

Every miner Worker shipped here declares these commands; its `mdk-contract.json` is the full list:

| Command        | Parameters         | Description                          |
|----------------|--------------------|--------------------------------------|
| `reboot`       |                    | Restart the miner (2 to 3 min downtime) |
| `setPowerMode` | `mode: string`     | Change the power mode                |
| `setLED`       | `enabled: boolean` | Toggle the physical LED indicator    |
| `setupPools`   | `pools: object`    | Configure mining pools               |

No miner Worker shipped here serves device provisioning (`registerThing`, `updateThing`, `forgetThings`), Worker
settings (`saveSettings`) or device comments (`saveComment`, `editComment`, `deleteComment`). Those are
[store services][worker-runtime-store] built-ins, served only by a legacy Worker that injects them.

## Health states

Every miner contract shipped here declares `OK`, `DEGRADED`, `OFFLINE`.

## Quickstart

```js
const path = require('path')
const { getKernel } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
  workerId: 'avalon-rack-1',
  storeDir: './store/avalon-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'AV-001', config: { address: '192.168.1.10', port: 4028, password: 'admin' } }]
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

The device list is fixed at construction: adding or removing a miner is a config edit and a restart. Each package's
own `USAGE.md` (e.g. [avalon][avalon-usage]) documents its device options and mock; with `mdk run`, the same device
list sits under the Worker's `config.devices` in `mdk.yaml`.

## Links

[mdk-worker-runtime-v2]: ../../core/mdk-worker/lib/worker-runtime-v2.js
<!-- docs@tether.io: mdk-worker-runtime-v2 → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime-v2.js -->

[worker-runtime-store]: ../../core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-runtime-store → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->

[run-whatsminer-worker]: ../../../docs/guides/miners/run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer-worker → https://github.com/tetherto/mdk/blob/main/docs/guides/miners/run-whatsminer-worker.md -->

[run-antminer-worker]: ../../../docs/guides/miners/run-antminer-worker.md
<!-- docs@tether.io: run-antminer-worker → https://github.com/tetherto/mdk/blob/main/docs/guides/miners/run-antminer-worker.md -->

[avalon-usage]: ./avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->
