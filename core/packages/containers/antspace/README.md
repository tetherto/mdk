# miningos-lib-container-antspace

MiningOS integration for **Antspace** container units (Bitmain cooling / enclosure controllers). This package provides container managers compatible with [`miningos-tpl-lib-container`](https://github.com/tetherto/miningos-tpl-lib-container) that talk to the Antspace HTTP API (`address` / `port`), collect snapshots and stats, and map device faults into MiningOS alerts.

Two hardware profiles are supported:

- **HK3 (hydro)** — `AS_HK3`: uses the hydro-oriented error and status mapping (`AntspaceHydro`).
- **Immersion** — `AS_IMM`: uses the immersion-oriented mapping (`AntspaceImmersion`).

Both managers extend the shared Antspace base (cooling operations, miner info, system data) and plug into the MiningOS container template (`miningos-tpl-lib-container`).

## Requirements

- **Node.js** ≥ 20

## Installation

```bash
npm install miningos-lib-container-antspace
```

Or install from the Git repository (e.g. a specific branch or tag):

```bash
npm install git+https://github.com/tetherto/miningos-lib-container-antspace.git
```

## Usage

### In a MiningOS service

Import the manager class that matches your Antspace deployment and register it the same way you register other container managers from `miningos-tpl-lib-container`. Each managed unit must define **`address`** and **`port`** for the Antspace HTTP endpoint (see `connectThing` in the type managers).

```js
const { AS_HK3, AS_IMM } = require('miningos-lib-container-antspace')
```

- **`AS_HK3`** — HK3 / hydro Antspace (`AnstspaceManagerHK3`).
- **`AS_IMM`** — Immersion Antspace (`AnstspaceManagerImmersion`).

The managers expose container-specific stats and alert specs under the usual MiningOS templates in this package (`lib/templates/stats.js`, `lib/templates/alerts.js`).

### Direct HTTP client (advanced)

Internal classes such as `Antspace`, `AntspaceHydro`, and `AntspaceImmersion` expect an HTTP client with `get` and `request` compatible with `bfx-facs-http` usage (see integration tests). Prefer going through the exported managers in production services.

## Development

```bash
npm install
npm test          # lint + unit + integration tests
npm run lint      # StandardJS
npm run test:unit
npm run test:integration
npm run test:coverage
```

## License

Apache-2.0
