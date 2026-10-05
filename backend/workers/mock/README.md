# Mock framework (`backend/workers/mock`)

A generic, layered foundation for device mocks. Provides a shared base plus composed transports, supporting a device mock
of just a few lines.

## Two axes

- **Inheritance (behavior):** `BaseMock` → `<category>.mock` → `<device>` leaf. The base owns all
  the boilerplate — the yargs CLI, mock-control-agent wiring, bulk-file expansion, initial-state
  loading, `--type` validation, the `{ state, start, stop, reset, exit }` lifecycle the control
  plane reads, and the `createServer` entry point. Category and leaf mocks add only behavior + a
  little config.
- **Composition (the wire):** `createTransport()` returns a transport adapter (`tcp` / `http` /
  `modbus` / `mqtt`). Transport does **not** line up with category — miners span encrypted-TCP +
  plain-TCP + HTTP, containers span HTTP + Modbus + MQTT — so it is composed in, not inherited.

## Layout

```text
backend/workers/mock/
├── base.mock.js            # BaseMock: shared foundation class
├── index.js                # Exports every base/transport/category class
├── mock-control-agent.js   # MockControlAgent: fastify control API over running mocks
├── transports/
│   ├── base.transport.js   # Contract: listen(host, port) / close() / get listening()
│   ├── tcp.transport.js    # raw net.Server (avalon plain; whatsminer external)
│   ├── http.transport.js   # fastify + auth (antminer, antspace, ocean, f2pool)
│   ├── modbus.transport.js # modbus-stream (abb, satec, schneider, seneca)
│   └── mqtt.transport.js   # mqtt client (bitdeer)
├── miner.mock.js           # Miner category mock
├── container.mock.js       # Container category mock
├── powermeter.mock.js      # Power-meter category mock
├── sensor.mock.js          # Sensor category mock
└── minerpool.mock.js       # Minerpool category mock
```

Device leaves stay in `backend/workers/<category>/<device>/mock/` and `require` their category mock
by relative path — the same convention the managers already use.

Whatsminer is a [manufacturer-maintained external Worker](../../../docs/reference/supported-hardware.md); there is no
in-repo Whatsminer mock leaf, though the generic `tcp` transport it speaks lives here.

## Coverage

All the device families run on the framework. A category that shares one wire (power meters, pools)
pins its transport; one whose vendors disagree (miners, containers) composes per leaf.

| Category (`*.mock.js`) | Transport | Devices                                                      |
| ---------------------- | --------- | ------------------------------------------------------------ |
| `miner`                | per-leaf  | Whatsminer (external; TCP, AES-encrypted + token), Avalon (TCP, plain cgminer), Antminer (HTTP, Digest auth) |
| `container`            | per-leaf  | Antspace (HTTP), Bitdeer (MQTT client)                       |
| `powermeter`           | Modbus    | ABB, Satec, Schneider                                        |
| `sensor` (extends `powermeter`) | Modbus | Seneca                                                 |
| `minerpool`            | HTTP      | Ocean, F2Pool                                                |

## Run

From the repo root, via the shared runner (comma-separated `type|device [port] [k=v]…`):

```text
npm run mock m56s 14028, s19xp 14029, b23 5071, ocean 8061
```

bitdeer is an MQTT **client**, so it needs a broker reachable at its `--port` before it serves.

## Add a new device

A Modbus power meter ("Siemens") is just a leaf — the category already pins the transport:

```js
// backend/workers/power-meter/siemens/mock/server.js
const PowerMeterMock = require('../../../mock/powermeter.mock')
class SiemensMock extends PowerMeterMock {
  static dir = __dirname
  static TYPES = ['s7m']
  static defaultPort = 5020
}
module.exports = SiemensMock.expose(module) // -> { createServer }, and runs the CLI when invoked directly
```

plus `initial_states/default.js` (its register map). For a `miner`/`container` whose transport
isn't fixed by the category, also implement `createTransport()` to return the adapter it speaks
(see [`miners/antminer`](../miners/antminer/README.md) for HTTP, [`miners/avalon`](../miners/avalon/README.md) for TCP, [`containers/bitdeer`](../containers/bitdeer/README.md) for MQTT). A
brand-new wire protocol only needs one new `transports/<x>.transport.js` adapter.

## Errors

| Code                | Fires when                        | Fix                                      |
| ------------------- | --------------------------------- | ---------------------------------------- |
| `ERR_ABSTRACT`      | An abstract mock method is not overridden: `createTransport()`, `routes()`, or a transport's `listen()` | Implement the method named in the error message on your mock or transport |
| `ERR_INVALID_STATE` | A mock's `type` has no matching `initial_states/<type>.js` and no `default.js` | Add an initial-state file for the type, or a `default.js` |
| `ERR_UNSUPPORTED`   | A mock is constructed with a `type` not in its class's declared `TYPES`        | Use a `type` the mock declares in `TYPES` |
