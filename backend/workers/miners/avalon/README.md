# @tetherto/mdk-worker-avalon

MDK Worker for Canaan Avalon Bitcoin miners. Supports the A1346 family.

## Supported models

| `model` value | Model |
|--------|-------|
| `a1346` | Avalon A1346 |

## Install

> [!IMPORTANT]
> `npm install @tetherto/mdk-worker-avalon` returns `E404`. The device Workers are not published to npm yet; they are
> workspace packages in the MDK monorepo. Clone it and install from the repository root instead.

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk && npm install
```

npm workspaces links `@tetherto/mdk-worker-avalon` into `node_modules`, so the `require` in the usage example
below resolves with no further step. See [the Worker install pattern](../../docs/install-pattern.md) for
what every Worker package ships and how to run one.

## Usage

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()

const worker = await startAvalonWorker({
  workerId: 'avalon-rack-3',
  model: 'a1346',
  storeDir: './store/avalon-rack-3',
  seedDevices: [{
    info: { serialNum: 'AV-001', container: 'container-C', pos: 'C1' },
    opts: { address: '192.168.1.30', port: 4028 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — see [USAGE.md](USAGE.md#registering-devices) for the full pattern and the
restart-required caveat.

## Protocol

Avalon uses the native CGMiner TCP API on port 4028 (unauthenticated) and supports fan control, clock tuning, and pool reconfiguration through the same API.

> [!WARNING]
> The CGMiner API is plain TCP. Pool credentials and the miner admin password cross the network unencrypted, so keep
> miners and the Worker on an isolated management network.

The Worker rejects any command parameter (pool URL, pool worker name, password, IP, DNS, fan speed) that contains `,`, `|` or
a control character, before it sends anything to the miner.

## Telemetry

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate_rt` | TH/s | Real-time hashrate |
| `hashrate_avg` | TH/s | Average hashrate |
| `power` | W | Current power draw |
| `temperature` | °C | Chip temperature |
| `fan_speed_in` | RPM | Inlet fan speed |
| `fan_speed_out` | RPM | Outlet fan speed |
| `status` | — | Device status |
| `uptime` | s | Seconds since last boot |
| `accepted_shares` | — | Total accepted shares |
| `rejected_shares` | — | Total rejected shares |
| `pool_url` | — | Active pool URL |
| `efficiency` | W/TH | Power efficiency |

## Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `reboot` | — | Restart the miner |
| `setPowerMode` | `mode: string` | Change power mode |
| `setLED` | `enabled: boolean` | Toggle LED |
| `setupPools` | `pools: object` | Configure pool URLs |
| `registerThing` | `info, opts` | Register device |
| `updateThing` | `info, opts` | Update device |
| `forgetThings` | `ids` | Remove devices |
| `saveSettings` | — | Persist settings |
| `saveComment` | `text` | Add annotation |
| `editComment` | `commentId, text` | Edit annotation |
| `deleteComment` | `commentId` | Delete annotation |

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Alerts:** `alert.overheat`, `alert.fan_failure`, `alert.hashrate_low`

## Errors

| Code                      | Fires when                                                                                     | Fix                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `ERR_COMMAND_ARG_INVALID` | A pool, password, network or fan-speed parameter contains `,`, `\|` or a control character | Remove the character; the CGMiner API cannot carry it |

## Testing

```bash
cd backend/workers/miners/avalon
npm test
```
