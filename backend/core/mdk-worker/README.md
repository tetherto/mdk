# @tetherto/mdk-worker

`WorkerRuntime` hosts a Worker Plugin's devices behind one HRPC channel to Kernel. Every
Worker package in this monorepo (miners, containers, power meters, temperature, minerpools, …) constructs a
`WorkerRuntime` from its own boot function; see [Workers](../../workers/README.md) for the plugin side of that
contract.

## What this package exports

```js
const { WorkerRuntime, loadPlugin, loadContract, createInstance, createModuleContext } = require('@tetherto/mdk-worker')
```

- `WorkerRuntime`: starts the Hyperswarm RPC server, dispatches MDK Protocol actions to per-device handlers, and
  persists the DHT/RPC keypair. It creates `opts.storeDir` owner-only (mode `0700`) and writes any file-backed seed
  `0600`, so the Worker's identity stays readable only by its owner
- `loadPlugin`: loads a plugin object (`mdk-contract.json`, handlers, ...) from a directory
- `loadContract`, `createInstance`, `createModuleContext` — the loader internals `loadPlugin` composes

## Store services

> [!CAUTION]
> **Deprecated.** Store services are the legacy thing/adapter Worker surface: `opts.services`, the built-ins in this
> section, `ctx.services` in handlers, and the `@tetherto/mdk-core` layer behind them
> ([`createWorkerInfra`](../mdk/lib/worker-infra.js), the `*Service` classes, and the `Thing` base classes the in-repo
> device drivers extend). Nothing is removed, because the in-repo Workers still run on it. Build a new Worker as a
> directory-loaded package on `WorkerRuntimeV2` with no `services`, the shape
> [Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md) walks through.
>
> MDK has no `WorkerRuntimeV2` equivalent yet for:
>
> - Adding or removing devices at runtime (`registerThing`, `updateThing`, `forgetThings`): a `WorkerRuntimeV2` device
>   list is fixed at construction, so a device change is a config edit and a restart
> - Store-backed history and aggregates (`logs`, `historical_logs`, `logs_multi`, `stats`) and pool `ext_data`
> - Device comments and Worker settings
> - Kernel write actions (`pushAction`): the Kernel resolves candidate writes with `write.calls.request`, which only a
>   Worker with the `actions` service answers

A [`WorkerRuntime`](lib/worker-runtime.js) host can inject an `opts.services` object naming which of the store-backed
capabilities below to serve. When present, [`service-builtins.js`](lib/service-builtins.js) answers the matching
queries and commands directly from a host-managed persisted store — never from the plugin's device handlers. A
Worker Plugin that doesn't need any of this passes `services: null`; see
[Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md)'s minimal reference implementation.

Each entry activates only when its named service exists on `opts.services`:

| Service      | Telemetry it activates  | Commands it activates | What it needs implemented         |
|--------------|-------------------------|-----------------------|-----------------------------------|
| `logHistory` | `logs`, `historical_logs`, `logs_multi` | — | `tailLog({thingId, ...})`, `getHistoricalLogs({thingId, ...})` |
| `settings`   | `settings` | `saveSettings` | `getSettings()`, `saveSettingsEntries(params)`        |
| `provisioning` | `thing_config`, `list`, `count`, `config` | `registerThing`, `updateThing`, `forgetThings` | `getThingConf`, `listDevices`, `listDeviceIds`, `registerThing`, `updateThing`, `forgetThings` |
| `stats`      | `stats` | — | `aggrStats(deviceIds, opts)` |
| `comments`   | — | `saveComment`, `editComment`, `deleteComment` | `saveThingComment`, `editThingComment`, `deleteThingComment` |
| `actions`    | `write.calls.request` (wired directly in `WorkerRuntime.handleRequest`, not through the builtin tables) | — | `getWriteCalls(payload)` |
| `pool`       | `ext_data` (scheduler-driven pool Workers) | — | `getWrkExtData({query})`           |
| `snaps`      | used only inside the `list` builtin, for `params.status` snapshot enrichment | — | `getLast(deviceId)` |

These never reach plugin handlers — they are Worker infrastructure, not device translation. When `provisioning` is
active, its `list` builtin shadows the runtime's own bare `{ deviceId, status }` device list with the fuller thing
list (`{ id, code, type, tags, info, comments, address, port, ... }`) some gateways read.

> [!IMPORTANT]
> Built-in commands must be published into the contract or the Kernel dispatcher rejects them
> (`ERR_COMMAND_NOT_IN_CAPABILITIES`) before they ever reach the runtime. [`mergeBuiltinCommands`](lib/service-builtins.js)
> handles this: it deep-clones the plugin's contract and appends one entry per *active* builtin command
> (`registerThing`, `updateThing`, `forgetThings`, `saveSettings`, `saveComment`, `editComment`, `deleteComment`) —
> the source contract is never mutated, and without `services` (or with every builtin inactive) the original contract
> reference is returned unchanged.

`allowEmptyDevices` (a `WorkerRuntime` constructor option, not a service) is the usual pairing with `provisioning`:
a fresh host boots with zero devices, takes `registerThing` writes to populate the store, and picks up the
provisioned set on its next restart. See [Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md)'s
troubleshooting section for the constructor-level error (`ERR_DEVICES_REQUIRED`).

Every in-repo device Worker (Avalon, Antspace, Bitdeer, ABB, SATEC, Schneider, Seneca) wires this surface through
[`createWorkerInfra`](../mdk/lib/worker-infra.js), which builds the `store`, `services`, and provisioning-first
`devices` list a `WorkerRuntime` needs, then hands the constructed `services` object straight to
`new WorkerRuntime(plugin, { ..., services, allowEmptyDevices: true })`. The F2Pool pool Worker injects only
a `pool` service. Reading [`miners/avalon/plugin/boot.js`](../../workers/miners/avalon/plugin/boot.js) alongside this
section is the fastest way to see the whole surface exercised end to end. Whatsminer and Antminer are
partner-maintained external Workers, listed in
[`backend/workers/external-workers.json`](../../workers/external-workers.json), hosted on `WorkerRuntimeV2` with no
`services`.

## Caller allowlist

The Worker RPC server is **fail-closed**. Only public keys on its allowlist may connect; unknown keys are rejected at
connect time and every request is re-checked (`ERR_WORKER_CALLER_NOT_ALLOWED`), so `revokeKey()` applies to open
connections. Every request is envelope-validated (`validateFull`) before dispatch.

```js
const runtime = new WorkerRuntime(plugin, {
  workerId: 'rack-1',
  devices,
  allowedKeys: [kernel.getClientPublicKey()] // the key the Kernel dials Workers with
})
runtime.allowKey(gatewayClientKeyHex)        // more callers, before or after start()
runtime.revokeKey(hex)
runtime.getAllowedKeys()
await runtime.start()
```

| Option | Default | Description |
| --- | --- | --- |
| `allowedKeys` | `[]` | Hex/Buffer public keys allowed to call. `start()` throws `ERR_WORKER_ALLOWED_KEYS_REQUIRED` when empty |
| `allowAll` | `false` | Admit every DHT peer that learns the Worker key. Development only; logs a warning at start |
| `bootstrap` | HyperDHT public bootstrap | Bootstrap nodes for the Worker's HyperDHT node; pass the same list to every component on a private DHT network |
| `dhtHost` | All interfaces | Interface the Worker's DHT node binds, such as `127.0.0.1` ([private DHT](../../../docs/guides/deployment/private-dht.md)) |

Admit the Kernel's **client** key (`kernel.getClientPublicKey()`), not its listener key (`getPublicKey()`), and no other,
so every command reaches a device through the Kernel's checks and its
[write-command log](../kernel/README.md#write-command-log). `@tetherto/mdk-core` and `mdk run` wire exactly that for local
stacks: `trustKernel(runtime, kernel)` in-process, `trustKeysFromDir(runtime, dir)` (only `kernel.pub`) across processes (see
the [mdk-core README](../mdk/README.md#trust-and-admission)). The [site security blueprint](../../../docs/guides/security/index.md#step-3-isolate-workers-and-devices) explains who gets access and what that access allows.
Every in-repo Worker boot function forwards `allowedKeys` /
`allowAll` to the runtime.

## Device health channel

`Kernel` `READY` and a `HEALTHY` Worker mean the Worker process answers; they say nothing about its devices. Every Worker
answers `telemetry.pull` `{ query: { type: 'health' } }` for each device with what its last metrics poll (the Kernel's
scheduled `telemetry.pull`) saw:

| Field | Meaning |
| --- | --- |
| `reachable` | `true` when any telemetry channel answered on the last poll, `false` when none did or the device is offline, `null` before the first poll |
| `lastSuccessAt` | Time (ms) of the last poll a channel answered, or `null` |
| `lastError` | The last channel error code (`ERR_TELEMETRY_FAILED`, `ERR_DEVICE_UNAVAILABLE: <id>`, or the handler's `ERR_*`), kept after the device recovers |
| `lastErrorAt` | Time (ms) of that error, or `null` |

"Worker up, device silent" is `reachable: false` on a `READY`, `HEALTHY` Worker. A plugin that knows better (a device with its
own status endpoint) may declare a `health` telemetry channel; it replaces the built-in one and should answer the same fields.

```js
const { value } = await mdkClient.pullTelemetry('wm-001', 'health')
// { reachable: false, lastSuccessAt: 1792505336310, lastError: 'ERR_TELEMETRY_FAILED', lastErrorAt: 1792505336317 }
```

## Request hardening

The Worker RPC key is reachable without going through the Kernel, so the runtime does not trust the caller to have
checked anything:

- **Command params** are validated against the contract's declared `params` (`type`, `required`, `enum`, `min`/`max`)
  before the handler runs, after positional (`{ value }` / `{ args }`) normalization. Undeclared keys pass through;
  a `null` or missing optional param is skipped. The built-in commands are checked against their published entries
  too. Arrays pass an `object` param (the schema has no `array` type).
- **Device id lists** in `logs_multi` and `stats` must be arrays of strings, at most `MAX_DEVICE_IDS` (1000) long.
- **Addressing:** the envelope's `deviceId` always wins over a `thingId`/`id` key in params; worker-scoped requests
  (`deviceId: null`) keep the caller's key.
- **Errors over RPC:** handler and service errors whose message starts with `ERR_` are returned as-is. Anything else
  is logged locally (`DEBUG=mdk:worker:runtime`) and replaced by `ERR_TELEMETRY_FAILED`, `ERR_COMMAND_FAILED` or
  `ERR_REQUEST_FAILED`, so driver messages carrying addresses or credentials never leave the process. Throw
  `ERR_*` errors from handlers for anything the caller should see.
- **Built-in `health` telemetry** returns only the [device health](#device-health-channel) fields; `env`, device `opts`
  and `config` are never returned.
- **Seed files** (`storeDir`): an existing seed that is not exactly 32 bytes fails start with
  `ERR_SEED_FILE_MALFORMED` instead of being replaced (which would rotate the Worker's identity). Symlinks
  (`ERR_SEED_FILE_SYMLINK`), non-regular files (`ERR_SEED_FILE_INVALID`) and files owned by another user
  (`ERR_SEED_FILE_OWNER`) are refused; group/other permission bits are stripped to `0600`. New seeds are created
  exclusively (`O_EXCL`) with mode `0600`.

## Errors

The plugin and contract loaders validate their inputs and throw on the first problem; the request handlers instead
return these codes on the response envelope's `error` field rather than throwing.

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_COMMAND_FAILED` | A command handler or built-in service throws an error whose message does not start with `ERR_` (details are logged locally) | Check the Worker's `mdk:worker:runtime` debug log; throw `ERR_*` errors from handlers |
| `ERR_CONTRACT_DIR_REQUIRED` | `loadContract` is called without a non-empty package-directory string | Pass the plugin package directory as `pkgDir` |
| `ERR_CONTRACT_INVALID_JSON` | The package's `mdk-contract.json` cannot be parsed as JSON | Correct the JSON syntax in `mdk-contract.json` |
| `ERR_CONTRACT_NOT_FOUND` | `mdk-contract.json` cannot be read in the package directory | Ensure `mdk-contract.json` exists in the package directory |
| `ERR_DEVICE_CONFIG_INVALID` | A device spec supplies `config` that is not an object | Pass `config` as an object or omit it |
| `ERR_DEVICE_ID_DUPLICATE` | Two device specs share the same `deviceId` | Give each device a unique `deviceId` |
| `ERR_DEVICE_ID_MISSING` | A device spec has no non-empty string `deviceId` | Give every device spec a `deviceId` string |
| `ERR_DEVICE_ID_REQUIRED` | A non-metrics telemetry query or a device command arrives with no `deviceId` | Include the target `deviceId` in the request |
| `ERR_DEVICE_INSTANCE_MISSING` | A handler is invoked for a device that has no open instance | Register the device and open its instance before invoking handlers |
| `ERR_DEVICE_NOT_FOUND` | A request targets a `deviceId` the Worker does not hold | Target a `deviceId` the Worker manages |
| `ERR_DEVICE_UNAVAILABLE` | A telemetry or command request targets a device that is not online | Wait for the device to reconnect and come online before retrying |
| `ERR_DEVICES_REQUIRED` | The runtime is started with an empty or missing device list where empty is not allowed | Supply at least one device spec |
| `ERR_INSTANCE_DEVICE_ID_REQUIRED` | `createInstance` is called with a device that has no non-empty `id` | Give the device object an `id` string |
| `ERR_INSTANCE_DEVICE_REQUIRED` | `createInstance` is called without a device object | Pass a `device` object to `createInstance` |
| `ERR_INSTANCE_DIR_REQUIRED` | `createInstance` is called without a non-empty `dir` string | Pass the plugin directory as `dir` |
| `ERR_INSTANCE_ENTRIES_REQUIRED` | `createInstance` is called without an `entries` object | Pass the resolved `entries` map |
| `ERR_INSTANCE_HANDLER_LOAD_FAILED` | A handler module throws while being loaded | Fix the error inside the handler module |
| `ERR_INSTANCE_HANDLER_NOT_FOUND` | A handler file path in the contract cannot be resolved | Correct the handler path in the contract |
| `ERR_INSTANCE_HANDLER_NOT_FUNCTION` | A resolved handler module does not export a function | Export a function from the handler module |
| `ERR_MODULE_CONTEXT_DIR_REQUIRED` | The module context is created without a non-empty `dir` string | Pass a directory when creating the module context |
| `ERR_NO_DEVICE_CONTEXT` | `@tetherto/mdk-worker/device` is required outside a plugin instance | Load the plugin via `createInstance({ dir, entries, device })` so the device context exists |
| `ERR_PARAM_ENUM` | A command param is not one of its declared `enum` values | Send one of the declared values |
| `ERR_PARAM_RANGE` | A numeric command param is outside its declared `min`/`max`, or a `deviceIds` list is longer than 1000 | Send a value in range; split long device lists |
| `ERR_PARAM_REQUIRED` | A param declared `required: true` is missing or `null` | Include the param |
| `ERR_PARAM_TYPE` | A command param does not match its declared `type`, or `deviceIds` is not an array of strings | Send the declared type |
| `ERR_PARAMS_INVALID` | Command `params` is not an object after positional normalization | Send `params` as an object |
| `ERR_PLUGIN_CONNECT_NOT_FUNCTION` | The plugin's `connect` is not a function | Provide a `connect` function on the plugin |
| `ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING` | The contract has no `capabilities` object | Add a `capabilities` object to the contract |
| `ERR_PLUGIN_CONTRACT_METADATA_MISSING` | The contract has no `metadata` object | Add a `metadata` object to the contract |
| `ERR_PLUGIN_CONTRACT_MISSING` | The plugin carries no contract object | Provide the plugin's contract |
| `ERR_PLUGIN_DIR_MISSING` | The plugin has no non-empty `dir` string | Set the plugin's `dir` |
| `ERR_PLUGIN_DISCONNECT_NOT_FUNCTION` | The plugin defines `disconnect` as something other than a function | Make `disconnect` a function or omit it |
| `ERR_PLUGIN_DUPLICATE_NAME` | Two entries in a contract section share a name | Give each entry in the section a unique name |
| `ERR_PLUGIN_ENTRY_NAME_MISSING` | A contract section entry has no non-empty `name` | Give every entry a `name` |
| `ERR_PLUGIN_HANDLER_MISSING` | A contract entry has no non-empty `handler` path | Set the entry's `handler` path |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | An entry's handler file cannot be required | Correct the entry's handler path |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | An entry's handler module does not export a function | Export a function from the handler |
| `ERR_PLUGIN_LOAD_HANDLER_NOT_FUNCTION` | `loadHandler` is provided but is not a function | Pass a function for `loadHandler` or omit it |
| `ERR_PLUGIN_REQUIRED` | `loadPlugin` is called without a plugin object | Pass a plugin object to `loadPlugin` |
| `ERR_PLUGIN_SECTION_NOT_ARRAY` | A contract capabilities section is present but is not an array | Make each capabilities section an array |
| `ERR_REQUEST_FAILED` | The RPC responder fails before or outside action dispatch (for example an undecodable request) | Send a well-formed MDK envelope |
| `ERR_SEED_FILE_INVALID` | A seed path in `storeDir` is not a regular file | Remove the entry so a new seed can be created |
| `ERR_SEED_FILE_MALFORMED` | A seed file in `storeDir` is not exactly 32 bytes | Restore the seed from backup, or delete it to accept a new Worker identity |
| `ERR_SEED_FILE_OWNER` | A seed file in `storeDir` is owned by another user | Run the Worker as the file's owner or fix the ownership |
| `ERR_SEED_FILE_SYMLINK` | A seed path in `storeDir` is a symbolic link | Replace the link with the real file |
| `ERR_TELEMETRY_FAILED` | A telemetry handler or built-in query throws an error whose message does not start with `ERR_` (details are logged locally) | Check the Worker's `mdk:worker:runtime` debug log; throw `ERR_*` errors from handlers |
| `ERR_UNKNOWN_ACTION` | An envelope carries an action the runtime does not handle | Send a supported action |
| `ERR_UNKNOWN_COMMAND` | A command request names a command the plugin does not define | Send a command declared in the contract |
| `ERR_UNKNOWN_QUERY_TYPE` | A telemetry query names a type the plugin does not provide | Query a telemetry type declared in the contract |
| `ERR_WORKER_DIR_REQUIRED` | WorkerRuntimeV2 is started without a non-empty `dir` string | Pass the Worker package directory as `dir` |
| `ERR_WORKER_ID_REQUIRED` | The runtime is constructed without a `workerId` string | Pass a `workerId` string |

## Next steps

See:

- [`backend/core/docs/README.md`](../docs/README.md#worker-runtime-tethertomdk-worker): where this package sits
  in Core's dependency graph
- [Workers](../../workers/README.md): the plugin packages this runtime hosts
