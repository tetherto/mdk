# miningos-lib-miner-avalon

JavaScript library that brings [Canaan Avalon](https://canaan.io/) miners into **MiningOS**. It implements the miner manager and device driver contract from [`miningos-tpl-lib-miner`](https://github.com/tetherto/miningos-tpl-lib-miner) and talks to the hardware over the miner’s TCP API (compatible with the cgminer-style interface on port **4028** by default).

Supported models are exposed as separate manager classes. Today this package ships **Avalon A1346** (`AV_A1346`).

## What it provides

- **Health and telemetry**: stats, extended stats (`estats`), pools, firmware/version, power modes, temperatures, hashrates, and alerts mapped into the MiningOS snapshot shape.
- **Control**: pool settings, network/DNS, reboot, LED, fan speed, factory reset, power modes (normal / high / sleep), and other Avalon `ascset` commands.
- **Integration**: TCP RPC via [`svc-facs-tcp`](https://github.com/tetherto/svc-facs-tcp); tags and thing type identify devices as Avalon miners for the control plane.

## Requirements

- **Node.js** ≥ 20 (see `package.json` `engine`)
- Network reachability from the MiningOS host to each miner’s API address and port (default **4028**)
- For full manager connectivity, devices must supply **`address`**, **`port`**, and **`password`** in their thing options (see `connectThing` in `lib/avalon.miner.manager.js`).

## Installation

```bash
npm install miningos-lib-miner-avalon
```

Or install from the Git repository (for example a specific branch or tag):

```bash
npm install git+https://github.com/tetherto/miningos-lib-miner-avalon.git
```

## Usage

### MiningOS integration

Import the manager class your application expects when registering miner drivers:

```js
const { AV_A1346 } = require('miningos-lib-miner-avalon')

// Register AV_A1346 with your MiningOS miner loader / control service
// so things of this type get connected with AvalonMiner + TCP.
```

`AV_A1346` is a subclass of the template’s `MinerManager`. It wires each device to `AvalonMiner` (`lib/avalon.miner.js`), which sends commands such as `summary`, `estats`, `pools`, `version`, and `ascset|…` over TCP. Exact registration steps depend on your MiningOS app; align with how other `miningos-lib-miner-*` packages are registered in that project.

### Nominal efficiency

Default nominal efficiency (W/TH) for supported models lives in `lib/utils/constants.js` (for example A1346). The manager merges these with template overrides via `getNominalEficiencyWThs`.

## Development

```bash
npm install
npm test
```

- **Lint**: `npm run lint` / `npm run lint:fix`
- **Unit tests**: `npm run test:unit`
- **Integration tests**: `npm run test:integration` (uses the in-repo mock miner server under `mock/`)

## License

Apache-2.0 (see `package.json`).
