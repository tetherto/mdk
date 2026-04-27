# miningos-lib-container-microbt

Node.js library that connects [MiningOS](https://github.com/tetherto) container “things” to **MicroBT** mining containers over **Modbus TCP**. It reads telemetry (power meters, PDUs, environment, CDU/cooling, diagnostics) and exposes write actions such as switching the container, cooling, fan thresholds, and PDU sockets, using the shared [`miningos-tpl-lib-container`](https://github.com/tetherto/miningos-tpl-lib-container) container pattern.

Two hardware/firmware profiles are supported:

- **Wonderint** (`MBT_WONDERINT`) — default register scaling and CDU behaviour.
- **Kehua** (`MBT_KEHUA`) — alternate mappings where the CDU and sensors differ (for example pump status and temperature scaling).

## Requirements

- Node.js **>= 20**

## Install

```bash
npm install miningos-lib-container-microbt
```

(If you consume it from Git, use the same URL and branch or tag your project already uses for other `miningos-*` packages.)

## Usage

### MiningOS container managers (recommended)

The package entry point exports two manager classes. Use the one that matches your deployment:

```js
const { MBT_WONDERINT, MBT_KEHUA } = require('miningos-lib-container-microbt')
```

Wire the chosen class into your MiningOS control stack like other container managers from `miningos-tpl-lib-container`. Each **thing** must provide:

| Option | Description |
|--------|-------------|
| `address` | Modbus TCP host (IP or hostname) |
| `port` | Modbus TCP port (commonly `502`) |
| `username` | CDU authentication username |
| `password` | CDU authentication password |

Optional tuning (passed through to the underlying client) includes `timeout`, `retry`, and `retryInterval` on the thing options, consistent with other container libs.

- **Thing type** reported by the manager includes a `-mbt` suffix and either `-wonderint` or `-kehua` (for example `container-mbt-wonderint`), so your registry/routing can distinguish profiles.
- **Tags**: things are tagged `microbt`; spec tags include `container`.

Snapshots are collected via `getSnap()` on the connected controller (power, ambient metrics, container-specific PDU/CDU data, errors, and diagnosis config as exposed by the template).

### Direct `MicroBT` usage (testing or custom integration)

For lower-level use outside the full manager lifecycle, you can construct `MicroBT` with a Modbus client factory from [`svc-facs-modbus`](https://github.com/tetherto/svc-facs-modbus) (or any compatible `getClient` implementation):

```js
const path = require('path')
const ModbusFacility = require('svc-facs-modbus')
const MicroBT = require('miningos-lib-container-microbt/lib/microbt')
const { CONTAINER_TYPES } = require('miningos-lib-container-microbt/lib/utils/constants')

const fac = new ModbusFacility(
  { ctx: { env: 'production', root: path.join(__dirname, '..') } },
  {},
  { env: 'production', root: path.join(__dirname, '..') }
)

const container = new MicroBT({
  getClient: fac.getClient.bind(fac),
  address: '192.0.2.10',
  port: 502,
  username: 'admin',
  password: 'your-password',
  type: CONTAINER_TYPES.WONDERINT // or CONTAINER_TYPES.KEHUA
})

await container.init()
const snap = await container.getSnap()
// …
container.close()
```

Call `init()` before reads/writes so CDU authentication completes. Call `close()` when finished to release the Modbus connection.

## Development

```bash
npm install
npm test        # lint + unit + integration tests
npm run lint    # StandardJS
```

License: **Apache-2.0** (see repository).
