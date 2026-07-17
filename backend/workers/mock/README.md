# Mock framework (`backend/workers/mock`)

A generic, layered foundation for device mocks, mirroring the Worker-manager hierarchy
(`ThingManager → MinerManager → WhatsminerManager`). It replaces the copy-pasted per-device
`mock/server.js` files with a shared base plus composed transports, so a device mock is a few lines
instead of a ~130-line boilerplate file.

## Two axes

- **Inheritance (behaviour):** `BaseMock` → `<category>.mock` → `<device>` leaf. The base owns all
  the boilerplate — the yargs CLI, mock-control-agent wiring, bulk-file expansion, initial-state
  loading, `--type` validation, the `{ state, start, stop, reset, exit }` lifecycle the control
  plane reads, and the `createServer` entry point. Category and leaf mocks add only behaviour + a
  little config.
- **Composition (the wire):** `createTransport()` returns a transport adapter (`tcp` / `http` /
  `modbus` / `mqtt`). Transport does **not** line up with category — miners span encrypted-TCP +
  plain-TCP + HTTP, containers span HTTP + Modbus + MQTT — so it is composed in, not inherited.

## Layout

```
backend/workers/mock/
  base.mock.js              BaseMock — the shared foundation
  index.js                  exports every base/transport/category class
  transports/
    base.transport.js       contract: listen(host, port) / close() / get listening()
    tcp.transport.js         raw net.Server      (whatsminer encrypted, avalon plain)
    http.transport.js        fastify (+ auth)    (antminer, antspace, ocean, f2pool)
    modbus.transport.js      modbus-stream       (abb, satec, schneider, seneca)
    mqtt.transport.js        mqtt client         (bitdeer)
  miner.mock.js  container.mock.js  powermeter.mock.js  sensor.mock.js  minerpool.mock.js
```

Device leaves stay in `backend/workers/<category>/<device>/mock/` and `require` their category mock
by relative path — the same convention the managers already use.

## Coverage

All 11 device families run on the framework. A category that shares one wire (power meters, pools)
pins its transport; one whose vendors disagree (miners, containers) composes per leaf.

| Category (`*.mock.js`) | Transport | Devices |
|---|---|---|
| `miner` | per-leaf | whatsminer (TCP, AES-encrypted + token), avalon (TCP, plain cgminer), antminer (HTTP, Digest auth) |
| `container` | per-leaf | antspace (HTTP), bitdeer (MQTT client) |
| `powermeter` | Modbus | abb, satec, schneider |
| `sensor` (extends `powermeter`) | Modbus | seneca |
| `minerpool` | HTTP | ocean, f2pool |

## Run

From the repo root, via the shared runner (comma-separated `type|device [port] [k=v]…`):

```
npm run mock m56s 14028, s19xp 14029, b23 5071, ocean 8061
```

bitdeer is an MQTT **client**, so it needs a broker reachable at its `--port` before it will serve.

## Adding a new device

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
(see `miners/antminer` for HTTP, `miners/whatsminer` for TCP, `containers/bitdeer` for MQTT). A
brand-new wire protocol only needs one new `transports/<x>.transport.js` adapter.
