# @tetherto/mdk-worker-bitdeer

MDK Worker for Bitdeer D40 mining container systems. Communicates via MQTT. Supports A1346, M30, M56, and S19XP container variants.

## Supported models

| `model` value | Model                                   |
| ------------- | --------------------------------------- |
| `a1346`       | D40 container for Avalon A1346 miners   |
| `m30`         | D40 container for Whatsminer M30 miners |
| `m56`         | D40 container for Whatsminer M56 miners |
| `s19xp`       | D40 container for Antminer S19XP miners |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-bitdeer` returns `E404`. The device Workers are not published to npm yet; they are
> workspace packages in the MDK monorepo. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-bitdeer` into `node_modules`, so the `require` in the usage example
below resolves with no further step. See [the Worker install pattern](../../docs/install-pattern.md) for
what every Worker package ships and how to run one.

## Usage

`startBitdeerWorker(opts)` embeds an MQTT broker (one per Worker process) that the containers publish into. Device
specs are keyed by `containerId`, not address/port:

| Option                 | Status   | Type     | Default   | Description                                                                     |
| ---------------------- | -------- | -------- | --------- | ------------------------------------------------------------------------------- |
| `opts.mqttPort`        | Optional | `number` | `10883`   | Port for the embedded MQTT broker                                               |
| `opts.mqttHost`        | Optional | `string` | `0.0.0.0` | Address the broker binds to                                                     |
| `opts.mqttCredentials` | Optional | `object` | none      | `{ [containerId]: { username, password } }`; when set, every client must log in |
| `opts.mqttTls`         | Optional | `object` | none      | [`tls.createServer`](https://nodejs.org/api/tls.html#tlscreateserveroptions-secureconnectionlistener) options (`key`, `cert`, ...); the broker then serves MQTTS |

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startBitdeerWorker } = require('@tetherto/mdk-worker-bitdeer')

const kernel = await getKernel()

const worker = await startBitdeerWorker({
  workerId: 'bitdeer-rack-1',
  model: 'm56',
  storeDir: './store/bitdeer-rack-1',
  mqttPort: 10883,
  mqttCredentials: {
    'D40-M56-001': { username: 'd40-m56-001', password: process.env.D40_M56_001_MQTT_PASSWORD }
  },
  seedDevices: [{
    info: { serialNum: 'D40-M56-001', container: 'container-A' },
    opts: { containerId: 'D40-M56-001' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — it persists immediately but only takes effect after the Worker is
stopped and restarted (`await worker.stop()`, then `startBitdeerWorker` again with no `seedDevices`) — there is no
hot-add.

## Protocol

Communicates via MQTT. The embedded broker accepts container connections; the container management system publishes status topics and subscribes to command topics.

The broker confines every client to a single registered container:

| Client action                                          | Result                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Publish `<containerId>RunningInfo`, `PDUData`, `MainData`, `TacticsData` or `ParameterData` | Allowed for the client's own container |
| Subscribe to `<containerId>PumpOperate`, `PDUOperate`, `CoolerOperate`, `TacticsSet`, `ParameterSet` or `RunningOperate` | Allowed for the client's own container (exact topic only) |
| Publish to a command topic                             | Refused, and the client is disconnected                                     |
| Subscribe to a wildcard, `$SYS`, or another container's topic | Refused with SUBACK `128`                                            |
| Use a `containerId` that is not a registered device    | Refused                                                                     |
| Publish a payload that is not valid JSON               | Dropped and logged under the `debug` namespace                              |

With `mqttCredentials`, a client's login decides its container. Without it, the broker accepts anonymous clients and binds
each connection to the first container it publishes or subscribes as.

> [!WARNING]
> Without `mqttCredentials`, any host that reaches the broker port can still connect as a registered container that has
> not connected yet and send that container's telemetry. Set `mqttCredentials`, bind `mqttHost` to the container network
> interface, and use `mqttTls` where the containers support MQTTS.

## Telemetry

| Field             | Unit | Description                     |
| ----------------- | ---- | ------------------------------- |
| `container_power` | W    | Total container power draw      |
| `temperature`     | °C   | Container ambient temperature   |
| `tank_status`     | —    | Cooling tank operational status |
| `exhaust_status`  | —    | Exhaust fan system status       |

## Commands

| Command                | Parameters         | Description                             |
| ---------------------- | ------------------ | --------------------------------------- |
| `setTankEnabled`       | `enabled: boolean` | Enable or disable the cooling tank      |
| `setAirExhaustEnabled` | `enabled: boolean` | Enable or disable exhaust fans          |
| `resetAlarm`           | —                  | Clear active alarm state                |
| `setTemperatureSettings` | `settings: object` | Update temperature control setpoints  |
| `registerThing`        | `info, opts`       | Register container                      |
| `updateThing`          | `info`             | Update container info                   |
| `forgetThings`         | `ids`              | Remove containers                       |
| `saveSettings`         | —                  | Persist settings                        |
| `saveComment`          | `text`             | Add annotation                          |
| `editComment`          | `commentId, text`  | Edit annotation                         |
| `deleteComment`        | `commentId`        | Delete annotation                       |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Error codes:**
- `E_TANK_FAIL` — Tank system failure
- `E_EXHAUST_FAIL` — Exhaust system failure

## Errors

| Code                        | Fires when                                            | Fix                                                          |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `ERR_DEVICE_CONFIG_INVALID` | A device is connected without `config.containerId` or `config.server` | Provide both `containerId` and `server` in the device config |
| `ERR_MODEL_INVALID`         | The `model` is not a supported Bitdeer model          | Use one of the [supported Bitdeer models](#supported-models) |
| `ERR_MQTT_CREDENTIALS_INVALID` | `opts.mqttCredentials` is not an object of `{ username, password }` entries with non-empty strings and unique usernames | Give every container a non-empty `username` and `password`, and use each username once |
| `ERR_OFFLINE`               | A read or snapshot (not a command) targets a device that is not online | Wait for the device to reconnect before retrying             |
| `ERR_STORE_DIR_REQUIRED`    | The boot function is called without `opts.storeDir`   | Pass a `storeDir` path to the boot function                  |
| `ERR_WORKER_ID_REQUIRED`    | The boot function is called without `opts.workerId`   | Pass a `workerId` to the boot function                       |

## Testing

```bash
cd backend/workers/containers/bitdeer
npm test
```
