# @tetherto/mdk-worker

`WorkerRuntime` hosts a Worker Plugin's devices behind one HRPC channel to Kernel. Every
Worker package in this monorepo (miners, containers, power meters, temperature, minerpools, …) constructs a
`WorkerRuntime` from its own boot function; see [Workers](../../workers/README.md) for the plugin side of that
contract.

## What this package exports

```js
const { WorkerRuntime, WorkerRuntimeV2, loadPlugin, loadContract, validateContract, validateParams, createInstance, createModuleContext } = require('@tetherto/mdk-worker')
```

Deep imports are closed: the package's `exports` map in [`package.json`](./package.json) lists every importable subpath, and
anything outside it fails to resolve with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

- `WorkerRuntime`: starts the Hyperswarm RPC server, dispatches MDK Protocol actions to per-device handlers, and
  persists the DHT/RPC keypair. It creates `opts.storeDir` owner-only (mode `0700`) and writes any file-backed seed
  `0600`, so the Worker's identity stays readable only by its owner. With a polling contract it also runs the
  [telemetry collector](#telemetry-collector) and keeps its series under `opts.telemetryStoreDir`
- `loadPlugin`: loads a plugin object (`mdk-contract.json`, handlers, ...) from a directory
- `validateContract`: [validates a parsed contract](#contract-validation) against the vendored schema
- `validateParams`: checks command parameters against a contract's `params`. It re-exports the Kernel's implementation from
  `@tetherto/mdk-kernel/protocol/params`, so a Worker runtime and Kernel accept exactly the same payloads
- `loadContract`, `createInstance`, `createModuleContext` — the loader internals `loadPlugin` composes
- `@tetherto/mdk-worker/sweep-memo`: a factory that memoizes one device read for the length of a single
  poll sweep. Call it inside your own module, then wrap each read:

  ```js
  const sweep = require('@tetherto/mdk-worker/sweep-memo')()
  module.exports = (params) => sweep(params, 'stats', () => client.getStats())
  ```

  The runtime hands every handler of one sweep the same `params` object and every other read a fresh one, so the
  memo is keyed on that object's identity: channels of the same device share one read within a sweep, and a later
  `metrics` or channel pull asks the device again rather than answering from a cache. Call the factory in the
  plugin's own module, never in a shared one, so the memo lives in that device's private module registry. A memo
  shared between devices would hand one device another's readings. Use it when several handlers need the same
  device response but `path` cannot merge them into one contract entry.
- `WorkerRuntimeV2` is the directory-loaded runtime a new Worker package builds on, which
  [Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md) walks through

## Contract validation

`validateContract(contract, { dir, semantic, strict })` checks a parsed `mdk-contract.json` against the vendored
[`mdk-contract.schema.json`](./mdk-contract.schema.json) and returns `{ ok, errors, warnings }`. `ok` means no errors, and
warnings never fail a contract. Findings come back on that object rather than being thrown, unlike the loader codes under
[Errors](#errors).

A contract that stamps `"contractVersion": "1"` opts into the v1 generation and is held to its requirements as errors. A
contract without the stamp is validated as legacy: v1 strictness findings come back as warnings, so those gaps do not
prevent loading. Pass `strict: true` to hold a legacy contract to the full requirements anyway, which is what
`mdk validate worker --strict` does.

| Requirement                          | Applies to                  | Legacy contract | Stamped contract       |
| ------------------------------------ | --------------------------- | --------------- | ---------------------- |
| `contractVersion` is declared        | The contract                | Warning         | Satisfied by the stamp |
| `unit` is declared                   | Numeric telemetry metrics   | Warning         | Error                  |
| `unit` uses the canonical vocabulary | Any declared telemetry unit | Warning         | Error                  |
| `min` and `max` are declared         | Numeric command parameters  | Warning         | Error                  |

The tier is declared structurally, by `x-mdk-strict` on the schema node, so it never depends on a message's text. Everything
else the schema requires is an error at both tiers: a wrong JSON type, a missing required property, an unexpected property,
or a value outside an allowed set.

`semantic: false` runs schema conformance alone, skipping duplicate-name, parameter-bound consistency, default-range and
handler-file checks. The catalogue generator uses this mode. `dir` is the package directory used to resolve handler paths
when semantic checks are enabled; without it, only the handler-file checks are skipped.

## Store services

> [!CAUTION]
> **Deprecated.** Store services are the legacy thing/adapter Worker surface: `opts.services`, the built-ins in this
> section, `ctx.services` in handlers, and the `@tetherto/mdk-core` layer behind them
> ([`createWorkerInfra`](../mdk/lib/worker-infra.js), the `*Service` classes, and the `Thing` base classes the in-repo
> device drivers extend). Nothing is removed, because in-repo Workers depend on it: for example, the Antspace Worker runs
> on `createWorkerInfra` and its store services, the Avalon device driver extends a `Thing` base class, and F2Pool's
> exported pool manager (`F2_POOL`) is built on `PoolService`. Build a new Worker as a directory-loaded package on
> `WorkerRuntimeV2` with no `services`, the shape
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

The Kernel authorizes a telemetry pull as `devices: read` on the device the envelope addresses and does not inspect
the query, so each builtin decides what a device-addressed read returns. A builtin answers only when its service is
present. Otherwise a plugin telemetry channel of the same name answers, in the plugin's own terms and outside this
table; with no such channel, the Worker answers [`ERR_UNKNOWN_QUERY_TYPE`, or `ERR_DEVICE_ID_REQUIRED`](#errors) when no
device is addressed. Workers the MDK boots with `runtime: 'v2'` get no store services.

| Builtin                                                             | A read addressed to one device returns                                                              |
|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| `logs` and `logs_multi` (`thing-5m`), `historical_logs`, `stats`, `thing_config`, `list` | The addressed device only; `tag`, `deviceIds`, `thingId` and `query` in params cannot widen it |
| `logs` and `logs_multi` (`stat-*`, or a key in `tailLogKeys`)       | The tag's shared log: for `stat-*`, the aggregate series over every device carrying the tag; for a `tailLogKeys` key, whatever its writer put there. For a tag the device lacks, `logs` is refused with `ERR_LOG_TAG_FORBIDDEN` and `logs_multi` returns no entries |
| `thing_config` with `requestType: 'poolConfig'`                     | The Worker's pool config, with secret-named fields (such as `password` or `apiKey`) redacted |
| `count`, `config`, `settings`, `ext_data`                           | Worker-level facts, whichever device is addressed                                                   |
| Not a builtin: `list` without `provisioning` (the runtime's own list) | Every device on the Worker, as `{ deviceId, status }`                                             |

Only grant `devices: read` on a Worker's device to a caller who may see that Worker's records. Only grant
`devices: write` on a device to a caller who may read every tag's shared log on that Worker: the tag check reads the
device's current tags, and `updateThing` can add any tag.

Addressed to a device, `logs_multi` returns no error for a log it can't read, including one for a tag the device lacks;
that log adds no entries. A Worker-scoped `logs_multi` with an invalid `deviceIds` list returns `{ error }`.

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

The Antspace, Bitdeer and Seneca Workers wire this surface through
[`createWorkerInfra`](../mdk/lib/worker-infra.js), which builds the `store`, `services`, and provisioning-first
`devices` list a `WorkerRuntime` needs, then hands the constructed `services` object straight to
`new WorkerRuntime(plugin, { ..., services, allowEmptyDevices: true })`. Reading
[`containers/antspace/plugin/boot.js`](../../workers/containers/antspace/plugin/boot.js) alongside this
section is the fastest way to see the whole surface exercised end to end. The Avalon, ABB, SATEC, Schneider and
F2Pool Workers, like the partner-maintained Whatsminer, Antminer and Ocean Workers listed in
[`backend/workers/external-workers.json`](../../workers/external-workers.json), are directory-loaded packages hosted
on `WorkerRuntimeV2` with no `services`.

## Caller allowlist

The Worker RPC server is **fail-closed**. Only public keys on its allowlist may connect; unknown keys are rejected at
connect time and every request is re-checked (`ERR_WORKER_CALLER_NOT_ALLOWED`), so `revokeKey()` applies to open
connections. Every request is envelope-validated (`validateFull`) before dispatch.

A fragment, not a script: `plugin` and `devices` come from the Worker package, `kernel` is an initialized Kernel, and
`directCallerKeyHex` is `keyPair.publicKey.toString('hex')`, the public key of the DHT keypair the direct caller dials with
(`createRawMdkClient({ hrpc: { key: rpcKey, keyPair } })` from `@tetherto/mdk-client`, where `rpcKey` is the Worker's RPC public key).
Call `await client.connect()` before issuing requests. A caller whose `keyPair` does not produce the allowed key is refused.

```js
const runtime = new WorkerRuntime(plugin, {
  workerId: 'rack-1',
  devices,
  allowedKeys: [kernel.getClientPublicKey()] // the key the Kernel dials Workers with
})
runtime.allowKey(directCallerKeyHex)         // a direct caller, before or after start()
runtime.revokeKey(directCallerKeyHex)
runtime.getAllowedKeys()
await runtime.start()
```

> [!CAUTION]
> A caller admitted this way reaches the Worker without going through the Kernel, so `spec.rbac` never judges the request
> and the [write-command log](../kernel/README.md#write-command-log) never records it. Admit one only for an operator tool
> that has to reach a device directly, and revoke it when that work is done.

| Option        | Default | Description                                                              |
| ------------- | ------- | ------------------------------------------------------------------------ |
| `allowedKeys` | `[]`    | Hex/Buffer public keys allowed to call. `start()` throws `ERR_WORKER_ALLOWED_KEYS_REQUIRED` when empty |
| `allowAll`    | `false` | Admit every DHT peer that learns the Worker key. Development only; logs a warning at start |
| `bootstrap`   | HyperDHT public bootstrap | Bootstrap nodes for the Worker's HyperDHT node; pass the same list to every component on a private DHT network |
| `dhtHost`     | All interfaces | Interface the Worker's DHT node binds, such as `127.0.0.1` ([private DHT](../../../docs/guides/deployment/private-dht.md)) |

Admit the Kernel's **client** key (`kernel.getClientPublicKey()`), not its listener key (`getPublicKey()`), and no other,
so every command reaches a device through the Kernel's checks and its
[write-command log](../kernel/README.md#write-command-log). `@tetherto/mdk-core` and `mdk run` wire exactly that for local
stacks: `trustKernel(runtime, kernel)` in-process, `trustKeysFromDir(runtime, dir)` (only `kernel.pub`) across processes (see
the [mdk-core README](../mdk/README.md#trust-and-admission)). The [site security blueprint](../../../docs/guides/security/index.md#step-3-isolate-workers-and-devices) explains who gets access and what that access allows.
Every in-repo Worker boot function forwards `allowedKeys` /
`allowAll` to the runtime.

## Device health channel

`Kernel` `READY` and a `HEALTHY` Worker mean the Worker process answers; they say nothing about its devices. Every Worker
answers `telemetry.pull` `{ query: { type: 'health' } }` for each device with what its last `metrics` read saw: a `metrics`
`telemetry.pull` (the Kernel schedules one) or, for a Worker that polls, the [telemetry collector](#telemetry-collector)'s sweep:

| Field            | Meaning                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `reachable`      | `true` when any telemetry channel answered on the last poll, `false` when none did or the device is offline, `null` before the first poll |
| `lastSuccessAt`  | Time (ms) of the last poll a channel answered, or `null`                        |
| `lastError`      | The last channel error code (`ERR_TELEMETRY_FAILED`, `ERR_DEVICE_UNAVAILABLE: <id>`, or the handler's `ERR_*`), kept after the device recovers |
| `lastErrorAt`    | Time (ms) of that error, or `null`                                              |

"Worker up, device silent" is `reachable: false` on a `READY`, `HEALTHY` Worker. A plugin that knows better (a device with its
own status endpoint) may declare a `health` telemetry channel; it replaces the built-in one and should answer the same fields.

```js
const { value } = await mdkClient.pullTelemetry('wm-001', 'health')
// { reachable: false, lastSuccessAt: 1792505336310, lastError: 'ERR_TELEMETRY_FAILED', lastErrorAt: 1792505336317 }
```

## Telemetry collector

A Worker gets a collector when `telemetryPollIntervalMs` is set in its contract or in `mdk.yaml` `spec.workers[].config`:
the runtime sweeps every online device once at start and then on that interval, calling each distinct handler once per
device and extracting every metric declared against it by its `path`, and stores the result as one `{ data, ts }` point
per device. Fleet reads are then answered from that store with no device call, and the sweep updates the
[device health channel](#device-health-channel) like a live poll does. `telemetryPollIntervalMs: null` in `mdk.yaml` turns
a contract's polling off; with the key in neither place, the runtime never polls or stores.

```json
{
  "telemetryPollIntervalMs": 60000,
  "aggregateCacheTtlMs": 60000,
  "telemetryRetention": { "rawMs": 86400000, "rollupIntervalMs": 300000, "keepMs": 2592000000 },
  "capabilities": {
    "telemetry": [
      { "name": "power",       "type": "number", "unit": "W",    "handler": "src/telemetry/stats.js", "path": "power" },
      { "name": "hashrate_rt", "type": "number", "unit": "TH/s", "handler": "src/telemetry/stats.js", "path": "minerData.hashrate" }
    ]
  }
}
```

The contract holds the vendor's defaults. An operator overrides any of these keys per Worker instance in `mdk.yaml`
under `spec.workers[].config`, which `mdk run` hands to the runtime as `opts.config`; `telemetryPollIntervalMs: null`
there turns a vendor's polling off:

```yaml
spec:
  workers:
    - name: antminer-a
      package: "@tetherto/mdk-worker-antminer"
      config:
        telemetryPollIntervalMs: 10000
        aggregateCacheTtlMs: 10000
```

| Key | Default | Effect |
| --- | --- | --- |
| `telemetryPollIntervalMs` | none (collector off) | Sweep interval; a positive integer |
| `aggregateCacheTtlMs` | one poll interval | How long an identical `aggregate` query is answered from memory while no sweep stores a point (floored at one poll interval); any sweep that stores a point drops every cached answer |
| `telemetryRetention.rawMs` | 86400000 (24 h) | Points stay at poll resolution for this long |
| `telemetryRetention.rollupIntervalMs` | 300000 (5 min) | Older points are replaced by one point per bucket of this size: the mean for `number` metrics, rounded to twelve significant digits so retention adds no floating-point noise, and the last value otherwise |
| `telemetryRetention.keepMs` | 2592000000 (30 d) | Points older than this are deleted; must not be shorter than the other two windows |
| `telemetryArchive` | `false` | Keep the raw points rollup thins out: each rolled bucket is appended to NDJSON day files before it is deleted (see [Archive](#archive)) |

The series lives in `opts.store` when the host passes an `@tetherto/hp-svc-facs-store` facility or a Hyperbee, else in a
store the runtime opens under `opts.telemetryStoreDir` (default `<storeDir>/telemetry`; `mdk run` uses
`.mdk/workers/<name>/telemetry`). The runtime refuses to construct with nowhere to write (`ERR_TELEMETRY_STORE_REQUIRED`).

Two query types read the store. Both are Worker-scoped (`deviceId: null`); with a `deviceId` they answer for that
device only (a third, `archive`, is device-scoped and listed under [Archive](#archive)):

| Query | Returns |
| --- | --- |
| `{ type: 'snapshot', metrics? }` | `{ devices: { [deviceId]: { ts, metrics: { [name]: { value } } } }, snapshotTs }`, the latest point per device |
| `{ type: 'snapshot', from, to?, granularity? }` | The same plus the echoed `from`, `to`, `granularity`, each metric as `{ points: [{ ts, value }] }`; `granularity` (`'5s'`, `'1m'`, `'1h'`, `'1d'` or ms) returns the stored reading nearest to each step |
| `{ type: 'aggregate', ops }` | `{ ops: { [name]: result }, partial, deviceCount }`, the op spec run over the latest point of every device whose point holds a reading (`deviceCount`); `partial` (the pre-tally pack the Kernel merges) is on Worker-scoped answers only |

A metric whose handler failed at that sweep is returned as its stored `{ error }` marker, so a reader can tell a gap from
a value; a device that answered nothing gets a point of markers, so a snapshot still says when it was last tried and why
it failed. A point retention rolled up carries `n`, the readings it stands for. The `metrics` query keeps reading the
device live, and the Kernel's scheduled pull leaves a polling Worker out: the capability payload carries the poll
interval in force (an `mdk.yaml` override included, and no key when polling is off), so nothing polls a device twice.

An `aggregate` op spec is keyed by result name: `{ op, src?, group?, filter?: { src, eq } }`, where `src` and `group`
are `metrics.<declared name>`, `info.<key>` or `deviceId`. `info` is the label block the host attaches to a device spec
(`{ deviceId, config, info }`; the CLI passes `config.devices[].info` from `mdk.yaml`, the legacy store services pass a
thing's `info`), so a site groups by `info.container` or `info.rack`. The device's `config` block is never a source:
it holds the host's connection details, credentials included. The ops are
[`@tetherto/mdk-stats`](../stats/README.md)'s, gated by the metric's declared type: a `number` accepts `sum`, `avg`,
`cnt`, `group`, `group_sum`, `group_avg`, `group_max`, `group_cnt` and `group_multiple_stats`; a `string` or `boolean`
accepts `cnt`, `group_cnt`, `group` and `group_multiple_stats`; an `array` accepts `arr_concat` and `array_obj_calc`; an
`object` accepts `obj_concat` and `nested_obj_concat` (their nested ops are `sum` only). Asking for `avg` on a `string`
is refused when the spec is validated (`ERR_AGGREGATE_OP_TYPE`), never answered with a wrong number. A device whose
reading for an op's source is missing, errored or not of the declared type is left out of that op. Through the Kernel, `mdkClient.pullSnapshot()` and
`mdkClient.pullAggregate()` fan a read out to several Workers and merge the answers.

### Archive

Rollup bounds the store by thinning old points; `telemetryArchive: true` (in the contract, or per instance in `mdk.yaml`
under `spec.workers[].config`) keeps them recoverable. Before a bucket's raw points are deleted they are appended to
`<telemetryArchiveDir>/<deviceId>/<YYYY-MM-DD>.ndjson` (the UTC day of each point, one `{ ts, data }` per line). A
retention pass appends a device's whole rollup backlog to each day file in one write and flushes it to disk once, so
a day of backlog costs one write per file rather than one per bucket. They are plain files an operator ships or prunes
with ordinary tooling. The directory is `opts.telemetryArchiveDir`
(`mdk run` uses `.mdk/workers/<name>/telemetry-archive`), else `<telemetryStoreDir>-archive` or
`<storeDir>/telemetry-archive`; with none of them the runtime refuses to construct (`ERR_TELEMETRY_ARCHIVE_DIR_REQUIRED`).
The archive itself is never pruned by the runtime.

| Call | Returns |
| --- | --- |
| `telemetry.pull` `{ type: 'archive' }` with a `deviceId` | `{ deviceId, days: [{ day, bytes }] }`, the day files the device has |
| `command.request` `restoreTelemetry` `{ from, to }` with a `deviceId` | `{ restored, buckets, from, to }`: the archived points of the range are put back at full resolution and the rolled points of the buckets they cover are removed |

`restoreTelemetry` is published with the contract while the archive is on, so the Kernel dispatches it like any command
(`devices` `write` under `spec.rbac`, logged in the command log) and `mdkClient.sendCommand(deviceId, 'restoreTelemetry', { from, to })`
reaches it. A restored range stays raw until `keepMs` expires it, and a restore is idempotent: the same range restored
twice holds each point once. A range older than `keepMs` is refused (`ERR_TELEMETRY_RESTORE_RANGE`), since expiry would
never revisit it. A restored point is marked as restored in the store, so a later retention pass leaves it raw,
including the first pass after a restart, which rescans a device's whole series.

> [!NOTE]
> A Worker that also enables the deprecated [store services](#store-services) (`stats`, `snaps`) runs two pollers: the
> legacy snaps collector and this one. They do not share data.

The Hyperbee store is append-only; the retention pass deletes old points and, when the runtime owns the store (a
facility or `telemetryStoreDir`), reclaims the blocks they unlinked, so disk use is bounded by `keepMs`. A host that
passes a Hyperbee sub keeps block reclamation for itself. Debug namespace: `mdk:worker:telemetry`.

## Request hardening

The Worker RPC key is reachable without going through the Kernel, so the runtime does not trust the caller to have
checked anything:

- **Command params** are validated against the contract's declared `params` (`type`, `required`, `enum`, `min`/`max`)
  before the handler runs, after positional (`{ value }` / `{ args }`) normalization. Undeclared keys pass through;
  a `null` or missing optional param is skipped. The built-in commands are checked against their published entries
  too. Arrays pass an `object` param (the schema has no `array` type).
- **Device id lists** in `logs_multi` and `stats` must be arrays of strings, at most `MAX_DEVICE_IDS` (1000) long, and
  are honored on Worker-scoped requests only: a request addressed to a device reads that device, whatever the list names.
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

The plugin and contract loaders validate their inputs and throw on the first problem, as does a Worker's telemetry
config when the runtime is constructed; the request handlers instead return these codes on the response envelope's `error`
field rather than throwing. The `ERR_CONTRACT_*` codes that
[`validateContract`](#contract-validation) produces are returned in its `errors` and `warnings` lists, and a strict-tier
finding lands in `warnings` on a contract that carries no `contractVersion`, unless `strict: true` forces it to an error.

| Code                                       | Fires when                                           | Fix                                       |
| ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------- |
| `ERR_AGGREGATE_CACHE_TTL_INVALID`          | The contract, or `mdk.yaml` `spec.workers[].config`, sets `aggregateCacheTtlMs` to something other than a non-negative integer | Set a non-negative integer, or omit it for the default |
| `ERR_AGGREGATE_FILTER_INVALID`             | An op's `filter` is not an object, its `src` names no declared source, or `eq` is not a primitive | Filter on a declared source with a string, number, boolean or `null` `eq` |
| `ERR_AGGREGATE_GROUP_INVALID`              | An op's `group` names no declared source             | Group by `metrics.<declared name>`, `info.<label>` or `deviceId` |
| `ERR_AGGREGATE_OP_TYPE`                    | An op is not valid for its source's declared type, or a nested op inside `objOps`/`nestedOps` is not `sum` | Use an op the source's type supports; keep nested ops to `sum` |
| `ERR_AGGREGATE_OP_UNKNOWN`                 | An op name is not one the [telemetry collector](#telemetry-collector) implements | Name an op the collector lists            |
| `ERR_AGGREGATE_SPEC_INVALID`               | `ops` is not a non-empty object, a result name is unsafe, or a `srcs` list or nested op list is malformed | Send a non-empty `ops` object with plain result names and the documented `srcs` and nested shapes |
| `ERR_AGGREGATE_SRC_UNKNOWN`                | A `src` names no declared metric, `info` label or `deviceId` | Name `metrics.<declared name>`, `info.<label>` or `deviceId` |
| `ERR_COMMAND_FAILED`                       | A command handler or built-in service throws an error whose message does not start with `ERR_` (details are logged locally) | Check the Worker's `mdk:worker:runtime` debug log; throw `ERR_*` errors from handlers |
| `ERR_CONNECT_NOT_SUPPORTED`                | Code calls `connect` on the plugin a `WorkerRuntimeV2` builds, a placeholder because that runtime opens an instance per device instead | Open devices through the runtime; do not call the plugin's `connect` |
| `ERR_CONTRACT_DEFAULT_RANGE`               | A command parameter's `default` falls outside its own `min` and `max` | Move the default inside the range, or widen the range |
| `ERR_CONTRACT_DIR_REQUIRED`                | `loadContract` is called without a non-empty package-directory string | Pass the plugin package directory as `pkgDir` |
| `ERR_CONTRACT_DUPLICATE_NAME`              | Two entries in the same contract section share a `name` | Give every telemetry metric and command a unique name |
| `ERR_CONTRACT_ENUM`                        | A value sits outside the schema's allowed set, such as a `unit` outside the canonical vocabulary | Use one of the values the message lists   |
| `ERR_CONTRACT_HANDLER_NOT_FOUND`           | A `handler` path resolves to no file in the package directory | Correct the handler path, or add the missing file |
| `ERR_CONTRACT_INVALID_JSON`                | The package's `mdk-contract.json` cannot be parsed as JSON | Correct the JSON syntax in `mdk-contract.json` |
| `ERR_CONTRACT_MINIMUM`                     | A numeric value is below the minimum the schema sets for it | Raise the value to at least the minimum the message names |
| `ERR_CONTRACT_NO_CONNECT`                  | A v1 `WorkerRuntime` calls `connect` on a plugin `loadContract` built, which carries a placeholder because a directory-loaded package has no process-wide connect | Host a directory-loaded package on `WorkerRuntimeV2`, which builds an instance per device instead |
| `ERR_CONTRACT_NOT_FOUND`                   | `mdk-contract.json` cannot be read in the package directory | Ensure `mdk-contract.json` exists in the package directory |
| `ERR_CONTRACT_PARAM_BOUNDS_INVALID`        | A command parameter declares a `min` above its `max` | Correct the bounds so `min` is not above `max` |
| `ERR_CONTRACT_PATH_INVALID`                | A telemetry entry's `path` is not a dotted keypath of identifiers or array indices, or a segment is `__proto__`, `constructor` or `prototype` | Use a keypath such as `minerData.hashrate` or `pools.0.url` |
| `ERR_CONTRACT_REQUIRED`                    | A property the schema requires is missing; at the strict tier that includes `contractVersion` | Add the property the message names        |
| `ERR_CONTRACT_RETENTION_INVALID`           | `telemetryRetention` sets `rawMs` or `rollupIntervalMs` above `keepMs` | Keep `keepMs` at least as long as both windows |
| `ERR_CONTRACT_TYPE`                        | A value's JSON type differs from the one the schema declares | Correct the value's type                  |
| `ERR_CONTRACT_UNEXPECTED`                  | The contract carries a property the schema does not define | Remove the property, or correct its spelling |
| `ERR_DEVICE_CONFIG_INVALID`                | A device spec supplies `config` that is not a plain object (an array or `null` is refused) | Pass `config` as an object or omit it     |
| `ERR_DEVICE_ID_DUPLICATE`                  | Two device specs share the same `deviceId`           | Give each device a unique `deviceId`      |
| `ERR_DEVICE_ID_INVALID`                    | A device spec's `deviceId` contains a NUL character | Remove the NUL from the `deviceId`        |
| `ERR_DEVICE_ID_MISSING`                    | A device spec has no non-empty string `deviceId`     | Give every device spec a `deviceId` string |
| `ERR_DEVICE_ID_REQUIRED`                   | A telemetry query other than `metrics`, `list`, `snapshot`, `aggregate` or a store built-in (an `archive` query included), or a command other than a built-in, arrives with no `deviceId` | Include the target `deviceId` in the request |
| `ERR_DEVICE_INFO_INVALID`                  | A device spec supplies `info` that is not a plain object (an array or `null` is refused) | Pass `info` as an object of labels or omit it |
| `ERR_DEVICE_INSTANCE_MISSING`              | A handler is invoked for a device that has no open instance | Register the device and open its instance before invoking handlers |
| `ERR_DEVICE_NOT_FOUND`                     | A request targets a `deviceId` the Worker does not hold | Target a `deviceId` the Worker manages    |
| `ERR_DEVICE_UNAVAILABLE`                   | A telemetry or command request targets a device that is not online | Wait for the device to reconnect and come online before retrying |
| `ERR_DEVICES_REQUIRED`                     | The runtime is started with an empty or missing device list where empty is not allowed | Supply at least one device spec           |
| `ERR_GRANULARITY_INVALID`                  | A `snapshot` query sets a `granularity` that does not resolve to a whole number of milliseconds, one or more | Send a whole-millisecond `granularity`, or omit it |
| `ERR_GRANULARITY_TOO_FINE`                 | A `snapshot` query's range divided by its `granularity` asks for more than 100000 sample steps | Widen the `granularity`, or narrow `from`..`to` |
| `ERR_HANDLER_NOT_BOUND`                    | A handler on the plugin `loadContract` builds is called directly, a placeholder because a directory-loaded package's handlers bind per device | Host the package on `WorkerRuntimeV2`, which binds them per device |
| `ERR_INSTANCE_DEVICE_ID_REQUIRED`          | `createInstance` is called with a device that has no non-empty `id` | Give the device object an `id` string     |
| `ERR_INSTANCE_DEVICE_REQUIRED`             | `createInstance` is called without a device object   | Pass a `device` object to `createInstance` |
| `ERR_INSTANCE_DIR_REQUIRED`                | `createInstance` is called without a non-empty `dir` string | Pass the plugin directory as `dir`        |
| `ERR_INSTANCE_ENTRIES_REQUIRED`            | `createInstance` is called without an `entries` object | Pass the resolved `entries` map           |
| `ERR_INSTANCE_HANDLER_LOAD_FAILED`         | A handler module throws while being loaded           | Fix the error inside the handler module   |
| `ERR_INSTANCE_HANDLER_NOT_FOUND`           | A handler file path in the contract cannot be resolved | Correct the handler path in the contract  |
| `ERR_INSTANCE_HANDLER_NOT_FUNCTION`        | A resolved handler module does not export a function | Export a function from the handler module |
| `ERR_MODULE_CONTEXT_DIR_REQUIRED`          | The module context is created without a non-empty `dir` string | Pass a directory when creating the module context |
| `ERR_NO_DEVICE_CONTEXT`                    | `@tetherto/mdk-worker/device` is required outside a plugin instance | Load the plugin via `createInstance({ dir, entries, device })` so the device context exists |
| `ERR_PARAM_ENUM`                           | A command param is not one of its declared `enum` values | Send one of the declared values           |
| `ERR_PARAM_RANGE`                          | A numeric command param is outside its declared `min`/`max`, or a `deviceIds` list is longer than 1000 | Send a value in range; split long device lists |
| `ERR_PARAM_REQUIRED`                       | A param declared `required: true` is missing or `null` | Include the param                         |
| `ERR_PARAM_TYPE`                           | A command param does not match its declared `type`, or `deviceIds` is not an array of strings | Send the declared type                    |
| `ERR_PARAMS_INVALID`                       | Command `params` is not an object after positional normalization | Send `params` as an object                |
| `ERR_PLUGIN_CONNECT_NOT_FUNCTION`          | The plugin's `connect` is not a function             | Provide a `connect` function on the plugin |
| `ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING` | The contract has no `capabilities` object            | Add a `capabilities` object to the contract |
| `ERR_PLUGIN_CONTRACT_METADATA_MISSING`     | The contract has no `metadata` object                | Add a `metadata` object to the contract   |
| `ERR_PLUGIN_CONTRACT_MISSING`              | The plugin carries no contract object                | Provide the plugin's contract             |
| `ERR_PLUGIN_DIR_MISSING`                   | The plugin has no non-empty `dir` string             | Set the plugin's `dir`                    |
| `ERR_PLUGIN_DISCONNECT_NOT_FUNCTION`       | The plugin defines `disconnect` as something other than a function | Make `disconnect` a function or omit it   |
| `ERR_PLUGIN_DUPLICATE_NAME`                | Two entries in a contract section share a name       | Give each entry in the section a unique name |
| `ERR_PLUGIN_ENTRY_NAME_MISSING`            | A contract section entry has no non-empty `name`     | Give every entry a `name`                 |
| `ERR_PLUGIN_HANDLER_MISSING`               | A contract entry has no non-empty `handler` path     | Set the entry's `handler` path            |
| `ERR_PLUGIN_HANDLER_NOT_FOUND`             | An entry's handler file cannot be required           | Correct the entry's handler path          |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION`          | An entry's handler module does not export a function | Export a function from the handler        |
| `ERR_PLUGIN_LOAD_HANDLER_NOT_FUNCTION`     | `loadHandler` is provided but is not a function      | Pass a function for `loadHandler` or omit it |
| `ERR_PLUGIN_REQUIRED`                      | `loadPlugin` is called without a plugin object       | Pass a plugin object to `loadPlugin`      |
| `ERR_PLUGIN_SECTION_NOT_ARRAY`             | A contract capabilities section is present but is not an array | Make each capabilities section an array   |
| `ERR_RANGE_INVALID`                        | A `snapshot` query sets `granularity` without `from`, a `from` or `to` that is not a finite number, or a `to` before `from`; or the `restoreTelemetry` command gets a missing or fractional `from` or `to`, or a `to` before `from` | Send numeric bounds with `from` no later than `to` |
| `ERR_REQUEST_FAILED`                       | The RPC responder fails before or outside action dispatch (for example an undecodable request) | Send a well-formed MDK envelope           |
| `ERR_SEED_FILE_INVALID`                    | A seed path in `storeDir` is not a regular file      | Remove the entry so a new seed can be created |
| `ERR_SEED_FILE_MALFORMED`                  | A seed file in `storeDir` is not exactly 32 bytes    | Restore the seed from backup, or delete it to accept a new Worker identity |
| `ERR_SEED_FILE_OWNER`                      | A seed file in `storeDir` is owned by another user   | Run the Worker as the file's owner or fix the ownership |
| `ERR_SEED_FILE_SYMLINK`                    | A seed path in `storeDir` is a symbolic link         | Replace the link with the real file       |
| `ERR_TELEMETRY_ARCHIVE_DIR_REQUIRED`       | On a polling Worker, `telemetryArchive` is `true` and the runtime has a `store` but no `telemetryArchiveDir`, `telemetryStoreDir` or `storeDir` | Pass one of those directories, or turn the archive off |
| `ERR_TELEMETRY_ARCHIVE_DISABLED`           | An `archive` query reaches a Worker whose archive is off | Set `telemetryPollIntervalMs` and `telemetryArchive: true` for that Worker, or skip the query |
| `ERR_TELEMETRY_ARCHIVE_INVALID`            | On a polling Worker, the contract or `mdk.yaml` `spec.workers[].config` sets `telemetryArchive` to something other than a boolean | Set `true` or `false`, or omit it         |
| `ERR_TELEMETRY_FAILED`                     | A telemetry handler or built-in query throws an error whose message does not start with `ERR_` (details are logged locally) | Check the Worker's `mdk:worker:runtime` debug log; throw `ERR_*` errors from handlers |
| `ERR_TELEMETRY_PATH_MISSING`               | A metric's declared `path` is missing from its handler's result, on a `metrics` pull or a collector sweep. The metric's value is the `{ error }` marker (stored when the Worker polls), and the read itself succeeds. | Correct the metric's `path`, or return that field from the handler |
| `ERR_TELEMETRY_POLL_INTERVAL_INVALID`      | The contract, or `mdk.yaml` `spec.workers[].config`, sets `telemetryPollIntervalMs` to something other than an integer between 1 and 2147483647 | Set a positive integer of milliseconds within that range, or omit it so the plugin does not poll |
| `ERR_TELEMETRY_RESTORE_RANGE`              | `restoreTelemetry` is sent a `from` more than `keepMs` before now, which expiry would drop again | Restore a range inside the `keepMs` window |
| `ERR_TELEMETRY_RETENTION_INVALID`          | On a polling Worker, `telemetryRetention`, in the contract or `mdk.yaml` `spec.workers[].config`, is not an object, has an unknown key, has a value that is not a positive integer, or has a `keepMs` shorter than `rawMs` or `rollupIntervalMs` | Set `rawMs`, `rollupIntervalMs` and `keepMs` as positive integers with `keepMs` the longest |
| `ERR_TELEMETRY_STORE_DISABLED`             | A `snapshot` or `aggregate` query reaches a Worker that does not poll | Set `telemetryPollIntervalMs` for that Worker, or read devices live |
| `ERR_TELEMETRY_STORE_REQUIRED`             | A polling Worker's runtime gets no `store`, `telemetryStoreDir` or `storeDir` | Pass one of them; `mdk run` passes `telemetryStoreDir` itself |
| `ERR_UNKNOWN_ACTION`                       | An envelope carries an action the runtime does not handle | Send a supported action                   |
| `ERR_UNKNOWN_COMMAND`                      | A command request names a command the plugin does not define | Send a command declared in the contract   |
| `ERR_UNKNOWN_QUERY_TYPE`                   | A telemetry query names a type the plugin does not provide | Query a telemetry type declared in the contract |
| `ERR_WORKER_ALLOWED_KEY_INVALID`           | An entry in `allowedKeys` is not a 32-byte hex public key | Pass each key as 64 hex characters, or as a Buffer |
| `ERR_WORKER_ALLOWED_KEYS_REQUIRED`         | `start()` is called with no `allowedKeys`            | Pass the Kernel client key from `kernel.getClientPublicKey()` |
| `ERR_WORKER_CALLER_NOT_ALLOWED`            | A caller's public key is not on the allowlist, checked at connect and again on every request | Add the caller's key to `allowedKeys`, or dial with an allowed keypair |
| `ERR_WORKER_DIR_REQUIRED`                  | WorkerRuntimeV2 is started without a non-empty `dir` string | Pass the Worker package directory as `dir` |
| `ERR_WORKER_ID_REQUIRED`                   | The runtime is constructed without a `workerId` string | Pass a `workerId` string                  |

## Next steps

See:

- [`backend/core/docs/README.md`](../docs/README.md#worker-runtime-tethertomdk-worker): where this package sits
  in Core's dependency graph
- [Workers](../../workers/README.md): the plugin packages this runtime hosts
