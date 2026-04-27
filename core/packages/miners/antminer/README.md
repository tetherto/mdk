# miningos-lib-miner-antminer

JavaScript library for [MiningOS](https://github.com/tetherto) that drives **Bitmain Antminer** machines over their HTTP API. It extends [`miningos-tpl-lib-miner`](https://github.com/tetherto/miningos-tpl-lib-miner) with digest-authenticated requests to the miner web UI (summary, stats, pools, configuration, errors, and related operations).

Supported hardware families are exposed as **thing managers**, one class per model line, so a control plane can register miners by type and collect normalized snapshots and alerts.

## Requirements

- **Node.js** >= 20

## Installation

```bash
npm install miningos-lib-miner-antminer
```

Or add the git dependency in `package.json` if you track a specific branch or revision (see this repo’s `package.json` for the pattern used upstream).

## What this package exports

The package entry re-exports four manager classes:

| Export       | Thing type        | Notes                          |
|-------------|-------------------|--------------------------------|
| `AM_S19XP`  | `miner-am-s19xp`  | Antminer S19 XP                |
| `AM_S19XPH` | `miner-am-s19xp_h`| Antminer S19 XP Hydro variant  |
| `AM_S21`    | `miner-am-s21`    | Antminer S21                   |
| `AM_S21PRO` | `miner-am-s21pro` | Antminer S21 Pro               |

Each manager extends the shared Antminer manager and sets the correct `getThingType()` value and internal miner `type` string used when talking to the device.

## Usage

### Thing managers (MiningOS integration)

Wire the manager that matches your hardware. The manager expects configuration under `thing.miner` and per-device options on each thing (`address`, `port`, `username`, `password`). Default HTTP port for miners is **80** unless overridden by config (`thing.miner.minerDefaultPort`).

```js
const { AM_S21 } = require('miningos-lib-miner-antminer')

const manager = new AM_S21(
  { thing: { miner: {} } },
  { rack: 'rack-1' }
)

const thg = {
  id: 'miner-001',
  opts: {
    address: '192.0.2.10',
    port: 80,
    username: 'root',
    password: 'your-password'
  }
}

const connected = await manager.connectThing(thg)
if (connected === 1) {
  const snap = await manager.collectThingSnap(thg)
  // snap.stats, snap.config, etc.
}
```

`connectThing` returns `1` when a connection was established and the thing’s `ctrl` is set to an `Antminer` instance; it returns `0` if required options are missing.

Alert templates and miner defaults for these thing types live alongside other MiningOS config (see `config/base.thing.json` in this repo for reference fields such as timeouts and nominal efficiency).

### Low-level `Antminer` client (advanced)

For tests or custom tooling you can construct the internal client directly. You must call `_setupClient()` after construction so digest auth is ready before any HTTP calls.

```js
const Antminer = require('miningos-lib-miner-antminer/lib/antminer.js')

const miner = new Antminer({
  address: '192.0.2.10',
  port: 80,
  errPort: 6060,
  username: 'root',
  password: 'your-password',
  type: 's21',
  nominalEfficiencyWThs: 22
})

await miner._setupClient()
const version = await miner.getVersion()
const summary = await miner.getSummary()
const snap = await miner.getSnap()
```

Use the `type` string that matches the device family (`s19xp`, `s19xp_h`, `s21`, `s21pro`) consistent with the manager you would otherwise use.

## Development

From a clone of this repository:

```bash
npm install
npm test
```

- `npm run lint` — [Standard](https://standardjs.com/) style check  
- `npm run test:unit` — unit tests  
- `npm run test:integration` — integration tests against the in-repo mock server  

## License

Apache-2.0 — see `LICENSE` and `package.json`.
