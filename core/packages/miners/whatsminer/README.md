# miningos-lib-miner-whatsminer

JavaScript library that adds **Whatsminer** ASIC support to [MiningOS](https://github.com/tetherto)–style miner control. It implements the shared miner template (`miningos-tpl-lib-miner`), talks to miners over TCP (default port **4028**), and exposes model-specific **miner manager** classes for use inside facility/control services.

## Supported hardware

| Export        | Typical use |
|---------------|-------------|
| `WM_M30SP`    | Whatsminer M30S+ family |
| `WM_M30SPP`   | Whatsminer M30S++ family |
| `WM_M53S`     | Whatsminer M53S |
| `WM_M56S`     | Whatsminer M56S |
| `WM_M63`      | Whatsminer M63 |

Each manager extends the base Whatsminer integration with the correct **thing type**, tags, and any model-specific actions (for example, extra whitelisted controls on certain models).

## Requirements

- **Node.js** ≥ 20

## Installation

```bash
npm install miningos-lib-miner-whatsminer
```

Or install from the repository (branch/tag as needed for your stack):

```bash
npm install git+https://github.com/tetherto/miningos-lib-miner-whatsminer.git
```

## Usage

This package is meant to be **registered as a miner manager** in a MiningOS control pipeline (same pattern as other `miningos-lib-miner-*` libraries): pick the export that matches the hardware line you are driving, and wire it into your facility/service configuration so the runtime can instantiate it with network and credential options.

At runtime, each managed miner is expected to provide at least:

- **address** — miner IP or hostname  
- **port** — API port (Whatsminer default is **4028** if not overridden)  
- **password** — miner web/API password used for token-based auth  

The library uses `svc-facs-tcp` for RPC and implements Whatsminer-specific commands (pools, power modes, firmware flows where applicable, stats, alerts, etc.) through the shared miner template.

**Example — require the manager for your model:**

```javascript
const { WM_M56S } = require('miningos-lib-miner-whatsminer')

// WM_M56S is a MinerManager subclass; register/instantiate it according to your
// MiningOS facility or control service (config-driven in production).
```

Exact registration (config keys, service bootstrap) depends on the parent MiningOS application; align with how other miner libraries are plugged in there.

## Development

From a clone of this repository:

```bash
npm install
npm test          # lint + unit + integration tests
npm run lint      # StandardJS
npm run lint:fix  # auto-fix where possible
```

Integration tests use the in-repo **mock** TCP server under `mock/` to simulate miner responses.

## License

Apache-2.0 — see [package.json](./package.json) and repository metadata.
