# miningos-lib-container-bitdeer

JavaScript library for [MiningOS](https://github.com/tetherto) rack control: it models **Bitdeer D40** liquid-cooled mining containers over **MQTT**. It subscribes to the container’s telemetry topics (power, PDU sockets, cooling, UPS, tactics, alarms), normalizes them into MiningOS **stats** and **config** snapshots, and sends operational commands (PDU, pumps, dry coolers, parameters, tactics, run/stop, alarm reset).

It builds on [`miningos-tpl-lib-container`](https://github.com/tetherto/miningos-tpl-lib-container): each export is a **container manager** you wire into a MiningOS rack service. Hardware-specific layouts (PDU/socket mapping per miner model) are handled inside the library.

## Exports

| Export | Miner / layout | Thing type (example) |
|--------|----------------|----------------------|
| `BD_D40_A1346` | Antminer A1346 | `container-bd-d40-a1346` |
| `BD_D40_M30` | M30 | `container-bd-d40-m30` |
| `BD_D40_M56` | M56 | `container-bd-d40-m56` |
| `BD_D40_S19XP` | S19 XP | `container-bd-d40-s19xp` |

Pick the export that matches the **D40 + miner model** deployed on that container.

## Requirements

- **Node.js** ≥ 20 (see `package.json` → `engine`)

Private Git dependencies are declared in `package.json`; ensure your environment can install them (SSH keys or tokens as required by your org).

## Installation

```bash
npm install miningos-lib-container-bitdeer
```

Or from this repository:

```bash
git clone https://github.com/tetherto/miningos-lib-container-bitdeer.git
cd miningos-lib-container-bitdeer
npm install
```

## Usage

### In a MiningOS rack / control service

1. Register the manager class that matches your hardware, e.g. `BD_D40_M56` from `require('miningos-lib-container-bitdeer')` (or `./index.js` in this repo).
2. For each **thing** (container), provide **`opts.containerId`**: the MQTT topic prefix the Bitdeer controller uses (must match the device configuration).
3. The manager starts an MQTT listener (via `svc-facs-mqtt`). By default it uses port **10883** unless your context sets `mqttPort` (see `lib/bitdeer.manager.js` and `lib/utils/constants.js`).

Thing registration validation expects `data.opts` to be present; the container controller is created when `opts.containerId` is set and the MQTT facility is ready.

### Programmatic use (e.g. tests or custom tooling)

You can construct the low-level `Bitdeer` container class (see `lib/bitdeer.js`) with:

- **`server`**: an MQTT broker interface with `subscribe` / `publish` (e.g. [Aedes](https://github.com/moscajs/aedes))
- **`containerId`**: same prefix as above
- **`type`**: one of `m56`, `m30`, `a1346`, `s19xp` (must match PDU mapping)
- **`conf`**: optional; e.g. `{ delay }` between published operations

Then call `getSnap()` for normalized stats/config, or the various `set*` / `switch*` methods for control. Integration tests under `tests/integration/` show a minimal broker + mock publisher setup.

## Development

| Script | Purpose |
|--------|---------|
| `npm run lint` | [Standard](https://standardjs.com/) style check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm test` | Lint + unit tests (`brittle`) + integration tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |

## License

Apache-2.0 — see [LICENSE](./LICENSE).
