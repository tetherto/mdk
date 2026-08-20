# @tetherto/mdk-worker-whatsminer

MDK Worker for MicroBT Whatsminer Bitcoin miners. Supports API v2 on port `4028` and API v3 on port `4433`.

## Runtime Model Profiles

Compatibility is determined by the API exposed by the installed firmware, not by a hard-coded model allowlist.
The following `model` values select the existing runtime profile and cooling-specific behavior:

| `model` value | Model | Notes |
|--------|-------|-------|
| `m30sp` | M30S+ | — |
| `m30spp` | M30S++ | — |
| `m53s` | M53S | — |
| `m56s` | M56S | Used in examples |
| `m63` | M63 | — |

## Install

```bash
npm install @tetherto/mdk-worker-whatsminer
```

## Usage

```js
const { getKernel } = require('@tetherto/mdk')
const { startWhatsminerWorker } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()

const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  model: 'm56s',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: {
      serialNum: 'WM56S-001',
      container: 'container-A',
      pos: 'A1',
      location: 'site-texas-01.container'
    },
    opts: {
      address: '192.168.1.10',
      // Omit port to auto-detect; API v3 on 4433 is preferred
      password: 'admin'
    }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`seedDevices` only seeds a fresh, empty `storeDir`. To add a device to an already-running Worker, send the
`registerThing` command over HRPC instead — see [USAGE.md](USAGE.md#registering-devices) for the full pattern and the
restart-required caveat.

## Protocol

Whatsminer devices speak one of two API generations. The Worker auto-detects which:

| API version | Default port | Auth command |
| --- | --- | --- |
| v2 (legacy) | `4028` | `get_token` |
| v3 (default) | `4433` | `get.device.info` |

Omit `opts.port` to probe API v3 first and fall back to API v2. Ports `4433` and `4028` select the corresponding
protocol directly. Pass `opts.apiVersion` to skip detection.

Authentication differs by version: v2 uses a salted MD5-crypt challenge-response token; v3 generates a fresh
SHA-256-derived token per command. The framed protocol keeps the outer command in plaintext and encrypts only
sensitive parameters (`set.miner.pools` and `set.user.change_passwd`) with AES-256-ECB. API v3 write commands
are sent once and are never automatically retried because a timeout leaves the physical outcome unknown.

## Telemetry

Live metrics collected on each poll cycle:

| Field | Unit | Description |
|-------|------|-------------|
| `hashrate_rt` | TH/s | Real-time hashrate |
| `hashrate_avg` | TH/s | Average hashrate |
| `power` | W | Current power draw |
| `temperature` | °C | Chip temperature |
| `fan_speed_in` | RPM | Inlet fan speed |
| `fan_speed_out` | RPM | Outlet fan speed |
| `status` | — | Device operational status |
| `uptime` | s | Seconds since last boot |
| `accepted_shares` | — | Total accepted shares (`0` on `api-v3`, where firmware does not expose the count) |
| `rejected_shares` | — | Total rejected shares (`0` on `api-v3`, where firmware does not expose the count) |
| `pool_url` | — | Active pool URL |
| `efficiency` | W/TH | Power efficiency ratio |
| `power_mode` | — | Current power mode (e.g. `normal`, `low`, `high`) |
| `api_version` | — | Detected API generation/version |
| `firmware_info` | — | Control-board, platform, firmware and API versions |
| `device_info` | — | Miner identity and network information, without credentials |
| `psu_info` | — | PSU identity, firmware, fan and electrical input information |
| `miner_stats` | — | Normalized performance, power, thermal and tuning statistics |
| `hashboards` | — | Per-board hashrate, frequency, chips and temperatures |
| `pools` | — | Pool endpoints and runtime status, without passwords |
| `errors` | — | Active device error codes and messages |
| `snap` | — | Full normalized stats and configuration snapshot |

## Commands

| Command | Parameters | Notes |
|---------|-----------|-------|
| `reboot` | — | Takes 2–3 min to resume; max once per 5 min |
| `setPowerMode` | `mode: string` | e.g. `normal`, `low`, `high`, `sleep` |
| `setLED` | `enabled: boolean` | Physical LED blink |
| `setupPools` | `pools: object` | Pool URL, worker and password; the password is only sent to the miner |
| `setPowerPct` | `pct: number (0–200)` | Above 100% is accepted only for supported hydro/immersion models |
| `downloadLogs` | — | Returns the `.tgz` archive as Base64 with size and SHA-256 metadata |
| `setNetwork` | `network: object` | Select DHCP or set static IPv4 details; the miner reboots after applying |
| `setHostname` | `hostname: string` | Set a 1–63 character controller hostname |
| `updateFirmware` | `firmware: object` | Verify and upload Base64 firmware bytes; requires filename, size and SHA-256 metadata; max 64 MiB |

Plus the standard device management commands: `registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`.

## Health

**States:** `OK`, `DEGRADED`, `OFFLINE`

**Alerts:**
- `alert.overheat` — chip temperature exceeded threshold
- `alert.fan_failure` — fan RPM below required minimum (fan RPM = 0 is mechanical failure)
- `alert.psu_failure` — power supply unit error
- `alert.hashrate_low` — hashrate below expected (may be board tuning — wait 15 min before escalating)

**Troubleshooting rules (from contract):**
- If `alert.overheat`: verify fan speeds. Fan speed of 0 is a mechanical failure.
- If `alert.hashrate_low`: miner may be tuning boards — wait 15 minutes.
- If status is `OFFLINE`: do not attempt reboot. Escalate to operator.

## Development with Mock Server

The package ships a mock TCP server that simulates the Whatsminer API v2 protocol. Examples bind it to `14028`
rather than the real v2 default (`4028`) so it doesn't collide with the Avalon mock, which binds its own real
default (`4028`); `examples/full-site` runs both simultaneously. Pick any free port for standalone use.

```js
const wmMock = require('@tetherto/mdk-worker-whatsminer/mock/server')

wmMock.createServer({
  port: 14028,
  host: '127.0.0.1',
  type: 'm56s',
  serial: 'WM-001',
  password: 'admin'
})
```

## Testing

```bash
cd backend/workers/miners/whatsminer
npm test
```
