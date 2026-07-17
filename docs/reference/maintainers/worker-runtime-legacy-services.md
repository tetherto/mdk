# Worker Runtime legacy services

`WorkerRuntime` internals for maintainers migrating or auditing pre-0.5.0 Workers: the `MDKWorkerAdapter`/`ThingManager`
migration history, and the `opts.services` "legacy worker-infra surface" that lets a `WorkerRuntime` host answer
adapter-era query and command types from a manager's persisted store instead of the device. Partners building a new
Worker Plugin from scratch don't need this file — see [Build a third-party Worker][build-a-worker] instead, whose
minimal reference implementation passes `services: null` and needs none of it.

## Migration from MDKWorkerAdapter and ThingManager

0.5.0 extracted the Worker runtime into a standalone [`@tetherto/mdk-worker`][mdk-worker-package] package
(`backend/core/mdk-worker/`) and migrated every worker in this monorepo onto the `WorkerRuntime` plugin model, deleting
the legacy `base/` packages (`ThingManager`, `mdk-worker-adapter.js`, the per-family `miners/base`, `containers/base`,
`power-meter/base`, `temperature/base`, `minerpools/base`).

[`WorkerRuntime`][mdk-worker-runtime] generalizes the former `MDKWorkerAdapter`: persistent seeds, the single HRPC
respond loop, and DHT topic announce all carried over unchanged in spirit. What changed is dispatch — `ThingManager`
delegation (one manager instance owning every device's business logic) was replaced by per-device handler dispatch
(`(ctx, params) => result`, `ctx = { deviceId, device, config, services }`), and [`loadPlugin`][mdk-worker-runtime]
loads a plain plugin object instead of instantiating a subclass.

## The `opts.services` surface

A `WorkerRuntime` host can inject an `opts.services` object. When present, [`service-builtins.js`][service-builtins]
serves the queries and commands that adapter-era workers answered from the manager's store — never from the plugin's
device handlers. Each entry activates only when its named service exists on `opts.services`:

| Service | Telemetry it activates | Commands it activates | What it needs implemented |
|---|---|---|---|
| `logHistory` | `logs`, `historical_logs`, `logs_multi` | — | `tailLog({thingId, ...})`, `getHistoricalLogs({thingId, ...})` |
| `settings` | `settings` | `saveSettings` | `getSettings()`, `saveSettingsEntries(params)` |
| `provisioning` | `thing_config`, `list`, `count`, `config` | `registerThing`, `updateThing`, `forgetThings` | `getThingConf`, `listDevices`, `listDeviceIds`, `registerThing`, `updateThing`, `forgetThings` |
| `stats` | `stats` | — | `aggrStats(deviceIds, opts)` |
| `comments` | — | `saveComment`, `editComment`, `deleteComment` | `saveThingComment`, `editThingComment`, `deleteThingComment` |
| `actions` | `write.calls.request` (wired directly in `WorkerRuntime.handleRequest`, not through the builtin tables) | — | `getWriteCalls(payload)` |
| `pool` | `ext_data` (scheduler-driven pool workers) | — | `getWrkExtData({query})` |
| `snaps` | used only inside the `list` builtin, for `params.status` snapshot enrichment | — | `getLast(deviceId)` |

These never reach plugin handlers — they are worker infrastructure, not device translation. When `provisioning` is
active, its `list` builtin shadows the runtime's own bare `{ deviceId, status }` device list with the legacy thing
list (`{ id, code, type, tags, info, comments, address, port, ... }`) that adapter-era gateways read.

> [!IMPORTANT]
> Built-in commands must be published into the contract or the Kernel dispatcher rejects them
> (`ERR_COMMAND_NOT_IN_CAPABILITIES`) before they ever reach the runtime. [`mergeBuiltinCommands`][service-builtins]
> handles this: it deep-clones the plugin's contract and appends one entry per *active* builtin command
> (`registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`) —
> the source contract is never mutated, and without `services` (or with every builtin inactive) the original contract
> reference is returned unchanged.

`allowEmptyDevices` (a `WorkerRuntime` constructor option, not a service) is the usual pairing with `provisioning`:
a fresh host boots with zero devices, takes `registerThing` writes to populate the store, and picks up the
provisioned set on its next restart. See [Build a third-party Worker][build-a-worker]'s troubleshooting section for
the constructor-level error (`ERR_DEVICES_REQUIRED`).

## Worked example

Every shipped miner Worker (`backend/workers/miners/{whatsminer,avalon,antminer}/plugin/boot.js`) wires this surface
through [`createWorkerInfra`][worker-infra], which builds the `store`, `services`, and provisioning-first `devices`
list a `WorkerRuntime` needs, then hands the constructed `services` object straight to `new WorkerRuntime(plugin, {
..., services, allowEmptyDevices: true })`. Reading one `boot.js` alongside this page is the fastest way to see the
whole surface exercised end to end — the pattern is identical across all three packages.

## Links

[build-a-worker]: ../../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[mdk-worker-package]: ../../../backend/core/mdk-worker/index.js
<!-- docs@tether.io: mdk-worker-package → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/index.js -->

[mdk-worker-runtime]: ../../../backend/core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: mdk-worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[service-builtins]: ../../../backend/core/mdk-worker/lib/service-builtins.js
<!-- docs@tether.io: service-builtins → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/service-builtins.js -->

[worker-infra]: ../../../backend/core/mdk/lib/worker-infra.js
<!-- docs@tether.io: worker-infra → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/lib/worker-infra.js -->
