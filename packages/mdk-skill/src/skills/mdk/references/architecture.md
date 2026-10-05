# MDK architecture

Load this when you need to know which module owns a behavior, or where a
request travels between a consumer and a physical device.

## Layers

```
Consumers (UI, CLI, agents)
    │  HTTP / @tetherto/mdk-client
Gateway (backend/core/gateway, boot glue in backend/core/mdk)
    │  MDK envelopes over HRPC
Kernel (backend/core/kernel)
    │  MDK envelopes over HRPC ('mdk' method), discovery via Hyperswarm DHT
Workers — WorkerRuntime/WorkerRuntimeV2 hosting a Worker Plugin (backend/core/mdk-worker + backend/workers/*)
    │  vendor protocol: CGMiner TCP, HTTP JSON, Modbus TCP, MQTT…
Devices (miners, power meters, sensors, containers)
```

## Kernel modules ([`backend/core/kernel/lib/modules/`](../../../../../../backend/core/kernel/lib/modules/))

Each module has one job and modules never cross-call, they interact through the interfaces they expose:

| Module                  | Job                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `worker-registry`       | `deviceId` → `workerId` → channel mapping; source of truth for routability; explicit state transition table                |
| `command-dispatcher`    | Validates a command against the Worker's declared capabilities (name, param types, `min`/`max` bounds → `ERR_PARAM_RANGE`) and routes it |
| `command-state-machine` | Command lifecycle with explicit transition table; every mutation is WAL'd before it takes effect; emits `command:done` |
| `telemetry-collector`   | Pull-based: sends `telemetry.pull`, returns the raw Worker payload                                                     |
| `health-monitor`        | Ping-based (`health.ping`); updates registry health state only                                                         |
| `scheduler`             | Drives the periodic pull/ping cadences                                                                                 |
| `action-manager` / `action-caller` | Write-action approval lifecycle (`action.push`, `action.vote`, …) between Gateway and Kernel                |

The protocol layer ([`backend/core/kernel/lib/protocol/`](../../../../../../backend/core/kernel/lib/protocol/)) owns the envelope
([`envelope.js`](../../../../../../backend/core/kernel/lib/protocol/envelope.js)), the action set ([`actions.js`](../../../../../../backend/core/kernel/lib/protocol/actions.js)) and per-action payload
validators ([`schemas.js`](../../../../../../backend/core/kernel/lib/protocol/schemas.js)); [`protocol.md`](./protocol.md) documents these in full.

## Worker side

Two Worker Plugin shapes exist side by side, hosted on two runtime classes
that share the same envelope dispatch, DHT discovery, and Kernel-facing
protocol. Details for both: [`../../mdk-worker-plugin/references/worker-base-api.md`](../../mdk-worker-plugin/references/worker-base-api.md).

A module-exporting Worker package ships a **Worker Plugin** — `plugin/index.js`
exporting `{ contract, dir, connect, disconnect? }` — plus plain device-client
code in `lib/`. It never subclasses anything and never depends on the runtime.
`WorkerRuntime` ([`backend/core/mdk-worker/lib/worker-runtime.js`](../../../../../../backend/core/mdk-worker/lib/worker-runtime.js)) is the
generic host: it loads the plugin (eagerly requiring every handler declared in
the contract), opens one frozen context `{ deviceId, device, config, services }`
per device via `connect()`, answers the `'mdk'` HRPC method by dispatching
envelopes to handlers, and announces itself on the Kernel's DHT topic. One
runtime hosts N same-type devices; a device whose `connect()` fails is held
`offline` (requests return `ERR_DEVICE_UNAVAILABLE`) without affecting
siblings. This is the shape every currently shipped device family
(`backend/workers/miners/*`, `power-meter/*`, `containers/*`, `minerpools/*`,
`temperature/*`) still uses.

A directory-loaded Worker package ships no module of its own: just
`mdk-contract.json` at its root plus the handler files it declares under
`src/` — no `plugin/index.js`, no `connect()`/`disconnect()`. `WorkerRuntimeV2`
([`backend/core/mdk-worker/lib/worker-runtime-v2.js`](../../../../../../backend/core/mdk-worker/lib/worker-runtime-v2.js))
takes the package's directory in place of a plugin object, and handlers are
plain `async (params) => result` functions that read their device from the
ambient `@tetherto/mdk-worker/device` module instead of a `ctx` argument.
There is no boot-time probe and no offline state: every device reports
`online` immediately, and an unreachable one surfaces as an error inside the
telemetry payload instead. This is the shape `mdk create worker` scaffolds
today; [`backend/workers/samples/demo-worker`](../../../../../../backend/workers/samples/demo-worker/README.md) is the only real reference
implementation on it so far.

## Discovery and request flow

1. A caller boots `WorkerRuntime` or `WorkerRuntimeV2` with a `kernelTopic`;
   the runtime joins that Hyperswarm topic in server mode and writes its HRPC
   public key to every incoming connection.
2. The Kernel connects to topic peers, learns the Worker's key, then sends
   `identity.request` and `capability.request`; the registry records the
   Worker's devices and its published contract (handler paths stripped).
3. The scheduler then drives `telemetry.pull` / `state.pull` / `health.ping`
   on a cadence; consumers trigger `command.request` through the Gateway (agents through the standalone MCP server).
4. Commands flow Gateway (or MCP server) → dispatcher (capability + bounds validation) →
   state machine (WAL) → Worker → `command.result` back up.

## Where things run

[`examples/full-site/start.js`](../../../../../../examples/full-site/start.js) boots the whole picture in one process tree:
mock devices, Kernel, 11 real Workers, Gateway and UI. Worker-hosting caller
for a single Worker, in-process and no Kernel:
[`examples/backend/demo-worker-caller/index.js`](../../../../../../examples/backend/demo-worker-caller/index.js).
