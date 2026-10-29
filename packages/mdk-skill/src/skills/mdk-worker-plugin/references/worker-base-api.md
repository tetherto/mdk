# Worker base API — `@tetherto/mdk-worker`

Load this when hosting a plugin, debugging envelope dispatch, or deciding what
belongs in the plugin vs the caller. Two Worker Plugin shapes exist side by
side: the module-exporting shape below, hosted on `WorkerRuntime`, and the
directory-loaded shape (see [Directory-loaded plugins](#directory-loaded-plugins-workerruntimev2)
below), hosted on `WorkerRuntimeV2` — the shape `mdk create worker` scaffolds
today. Source: [`backend/core/mdk-worker/lib/worker-runtime.js`](../../../../../../backend/core/mdk-worker/lib/worker-runtime.js),
[`lib/worker-runtime-v2.js`](../../../../../../backend/core/mdk-worker/lib/worker-runtime-v2.js), and
[`lib/plugin-loader.js`](../../../../../../backend/core/mdk-worker/lib/plugin-loader.js);
package entry [`backend/core/mdk-worker/index.js`](../../../../../../backend/core/mdk-worker/index.js) exports
`{ WorkerRuntime, WorkerRuntimeV2, loadPlugin, loadContract, createInstance, createModuleContext }`.

## The plugin contract (`loadPlugin`)

A Worker Plugin is `{ contract, dir, connect, disconnect? }`:

- `contract` — the parsed `mdk-contract.json`.
- `dir` — `__dirname` of the plugin; handler paths resolve against it.
- `connect(config, { deviceId }) => device` — build (and probe) one device
  client. Throwing here holds the device `offline` without failing the boot.
- `disconnect(device, { deviceId })` — optional; close sockets etc.

`loadPlugin` **eagerly requires every handler** declared under
`capabilities.telemetry` and `capabilities.commands` — a missing file,
non-function export, missing `handler` field, or duplicate name aborts with
`ERR_PLUGIN_HANDLER_NOT_FOUND` / `ERR_PLUGIN_HANDLER_NOT_FUNCTION` /
`ERR_PLUGIN_HANDLER_MISSING` / `ERR_PLUGIN_DUPLICATE_NAME`. Nothing loads
lazily at request time. It returns
`{ contract, publishedContract, handlers, connect, disconnect }` where
`publishedContract` has all `handler` paths stripped (that copy is what
`capability.response` sends).

## Handler signature

Telemetry and command handlers are identical in shape:

```js
module.exports = async (ctx, params) => result
```

`ctx` is frozen per device: `{ deviceId, device, config, services }`.
`device` is whatever `connect()` returned; `services` is `null` unless the
caller injected worker-infra services. Handlers never see envelopes or
transport — the runtime wraps their return value (or thrown error) into the
response envelope.

## `new WorkerRuntime(plugin, opts)`

| Option | Required | Meaning |
| --- | --- | --- |
| `workerId` | yes | Identity string; `ERR_WORKER_ID_REQUIRED` otherwise |
| `devices` | yes* | `[{ deviceId, config? }]`; duplicates/missing ids throw. *`allowEmptyDevices: true` permits a device-less provisioning-first boot |
| `kernelTopic` | no | Hex string or Buffer; when set, the runtime announces on this DHT topic |
| `store` | no | Persistent store (Hyperbee-style) for the DHT/RPC seeds → stable public key across restarts; without it keys are random per boot |
| `storeDir` | no | Directory for file-backed DHT/RPC seeds (same stability as `store`, for hosts that do not own a Hyperbee). Ignored when `store` is set |
| `services` | no | Worker-infra services (logs, settings, stats, comments, provisioning…). Served as built-ins ahead of plugin handlers and exposed to handlers as `ctx.services` |
| `bootstrap` | no | Custom DHT bootstrap nodes: a private network's list, or `hyperdht/testnet` in hermetic tests |
| `dhtHost` | no | Interface the DHT node binds, such as `127.0.0.1` for a same-machine private network |

One runtime hosts N same-type devices behind one HRPC channel. The device
list is fixed at construction.

## Lifecycle

- `await start()` — opens device contexts (`connect` per device; failures →
  `offline`), starts the HRPC server responding on the `'mdk'` method, and —
  if `kernelTopic` is set — joins the topic in server mode, writing its public
  key to each incoming connection and re-announcing every 30 s. Returns
  `{ publicKey }`.
- `await stop()` — tears down swarm/RPC/DHT and calls `disconnect` per online
  device.
- `getPublicKey()` — HRPC public key (null before `start`).
- `getDeviceContext(deviceId)` — the frozen ctx of an *online* device, for the
  process that owns the runtime (e.g. a sampler loop); null while offline. On
  `WorkerRuntimeV2` this returns `{ deviceId, config, services }` with no
  `device` key — see [below](#directory-loaded-plugins-workerruntimev2).
- `await handleRequest(envelope)` — the entire protocol surface; usable
  directly in-process for tests (no `start()` needed for identity/capability;
  device-touching actions need contexts opened by `start()`).

## Directory-loaded plugins (`WorkerRuntimeV2`)

A directory-loaded Worker Plugin exports no module of its own: the package
ships only `mdk-contract.json` at its root plus the handler files it declares
under `src/`. There is no `plugin/index.js` and no `connect()`/`disconnect()`.
`new WorkerRuntimeV2(dir, opts)` takes the package's directory in place of a
plugin object — it calls `loadContract(dir)` internally to resolve the
contract and every handler path, then builds one plugin instance per
configured device via `createInstance({ dir, entries, device })` when each
device's context opens.

- **Handler signature**: `async (params) => result` — no `ctx` argument.
  Handlers instead `require('@tetherto/mdk-worker/device')`, an ambient module
  giving `{ id, opts, env, config, logger }` for the device the handler is
  currently bound to. `opts` is that device's own connection config (the
  `config` entry from `opts.devices` at construction); `env` and `config` are
  the plugin-wide blocks passed as `opts.env`/`opts.config` to the runtime.
- **Isolation**: `WorkerRuntimeV2` loads the package's files into a private
  module registry per device, so a client module that binds to the ambient
  device at load time already gets one instance per device with no explicit
  per-device construction, and `require('../client')` inside one device's
  handlers always resolves to that device's own instance.
- **No boot-time probe, no offline state**: every declared device reports
  `online` as soon as `runtime.start()` returns. An unreachable device
  surfaces as an error inside the telemetry payload for the channel that
  touched the network (or `status: 'FAILED'` for a command), not as
  `ERR_DEVICE_UNAVAILABLE`.
- **No `disconnect()`**: whatever a handler module opens at load time (a
  socket, a file handle) lives until the process exits; nothing closes it
  automatically.
- **Builtin `health` channel**: every plugin answers
  `telemetry.pull { query: { type: 'health' } }` automatically — `{ reachable,
  lastSuccessAt, lastError, lastErrorAt }` from the addressed device's last
  metrics poll (never `env`, `opts` or `config`) — unless the contract itself
  declares a `health` channel, which always wins and should answer the same
  fields.

`loadContract(dir)` and `createInstance({ dir, entries, device })` are also
usable directly, without a runtime, for contract-level tests — see
[`local-testing.md`](./local-testing.md).

## Envelope dispatch (`handleRequest`)

| Action | Behaviour |
| --- | --- |
| `identity.request` | `{ workerId, devices: [{ deviceId }] }` |
| `capability.request` | `{ contract: publishedContract }` (built-in commands merged in when services are present) |
| `telemetry.pull` | `query.type` routing — see [`../../mdk/references/protocol.md`](../../mdk/references/protocol.md). `metrics` runs every telemetry handler; a channel name runs one; `list` returns device statuses; service built-ins (`logs`, `settings`, `stats`, …) take precedence over plugin channels |
| `command.request` | Built-ins first (provisioning/store commands work for offline devices); then device must exist and be online; unknown command → `ERR_UNKNOWN_COMMAND`; handler success → `{ commandId, status: 'SUCCESS', result }`, throw → `{ status: 'FAILED', error }` |
| `health.ping` | `{ status: 'OK' }` |
| `state.pull` | `{ state: { <deviceId>: { status } }, deviceCount, workerId }` |
| `write.calls.request` | Only when `services.actions` is injected |
| anything else | `ERR_UNKNOWN_ACTION` |

Failure isolation: a handler that throws poisons only that field
(`metrics.<name> = { error }`) or that command — never the Worker. An offline
device answers `ERR_DEVICE_UNAVAILABLE`; a wrong id `ERR_DEVICE_NOT_FOUND`.

## Param normalization

Legacy write paths dispatch positionally (`{ value: x }` or
`{ args: [...] }`). The runtime maps those onto your contract-declared param
names before your handler runs, so handlers only ever see named params —
provided the contract declares params accurately.

## What the runtime does NOT do

- It does not validate contracts against the JSON Schema (that's
  [`../scripts/validate-contract.mjs`](../scripts/validate-contract.mjs) and the catalogue lint).
- It does not enforce param types or `min`/`max` bounds — the **Kernel's**
  dispatcher does, and only for declared bounds. In-process callers of
  `handleRequest` bypass that check (the smoke harness replicates it).
- It has no HTTP mode and no CLI — a caller process constructs it (see
  the minimal caller in [`local-testing.md`](./local-testing.md#3-standalone-protocol-check-workerruntimev2-real-envelopes-still-no-kernel)).
