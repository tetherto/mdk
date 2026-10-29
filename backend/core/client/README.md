# @tetherto/mdk-client

## Overview

MDK Protocol client for [Kernel](../kernel/README.md). Encodes MDK Protocol envelopes and sends them to Kernel over **HRPC** (the
`@hyperswarm/rpc` listener, by public key). This is the transport layer
used by the [Gateway](../gateway/README.md) (and any other process) to talk to Kernel — and, by key, directly to a
[Worker's](../../workers/README.md) RPC server.

> [!TIP]
> `@tetherto/mdk-client` is the protocol connector every Kernel caller uses — the [Gateway](../gateway/README.md) wraps
> it internally. For the full layer model, read the [Gateway README](../gateway/README.md)
> and/or the [architecture overview](../../../docs/concepts/architecture.md).

## When to use which client path

Use [`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client) for an app or any other consumer
talking to Kernel: device commands, status queries, telemetry pulls, and, through it,
[`sendWorkerCommand`](#sendworkercommandworkerid-deviceid-command-params-opts--promiseobject) /
[`pullWorkerTelemetry`](#pullworkertelemetryworkerid-query-opts--promiseobject) for provisioning operations
(`registerThing`, `forgetThings`) or Worker-scoped historical queries (logs, stats) that aggregate across a Worker's own
store. Those two reach a Worker directly, so they need the caller's key on the Worker's allowlist, which the defaults leave out.

> [!CAUTION]
> Those provisioning commands and Worker-infra query types belong to the deprecated
> [store services surface](../mdk-worker/README.md#store-services). Only a Worker started with `services` serves them;
> a Worker without `services` rejects them with `ERR_DEVICE_ID_REQUIRED` when the call names no device,
> `ERR_DEVICE_NOT_FOUND` or `ERR_DEVICE_UNAVAILABLE` when it names an unknown or offline device, and otherwise
> `ERR_UNKNOWN_COMMAND` or `ERR_UNKNOWN_QUERY_TYPE`.

> [!NOTE]
> Kernel also exposes `registerThing`/`forgetThings` as governed [write actions](#write-action-methods) and
> `pushAction`/`voteAction` for when you want the approval/voting flow instead of a direct call.

## Prerequisites

- Node.js >= 24. `@tetherto/mdk-client` ships as a Node.js package; no Python, Go, or other-language client exists yet

## Install

```bash
npm install @tetherto/mdk-client
```

## Usage

[`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client) is auto-connecting: [`connect()`](#connectopts--promisevoid)
is optional (only needed for an up-front warmup) — methods connect lazily on first use.

```js
const { createMdkClient } = require('@tetherto/mdk-client')

// kernelKey: from kernel.getPublicKey() in-process, or the key file Kernel
// publishes on start (`@tetherto/mdk-core`'s DEFAULT_KEY_FILE). kernelCredential:
// the service account to sign in as. Inside an app, use config.mdkClient from
// require('@tetherto/mdk-gateway/plugin') instead: the app runtime builds it.
const client = createMdkClient({ kernelKey, kernelCredential: { name: 'operator-agent', privateKey } })

// Aggregated, retry-wrapped status (recommended for tooling/operators)
const { workers, totalDevices } = await client.getStatus()

// Pull telemetry for a device
const telemetry = await client.pullTelemetry('wm-001', 'metrics')

// Send a command
const result = await client.sendCommand('wm-001', 'reboot', {})

await client.close()
```

Want [`connect()`](#connectopts--promisevoid) mandatory before the first request instead of lazy, or need to inject a
raw test transport by hand? Use [`createRawMdkClient`](#createrawmdkclientopts--client), which
[`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client) wraps.

## API

### `createMdkClient(config, opts?)` → auto-connecting client

The client most consumers want: instantiate once from an ambient config and call action methods directly —
`mdkClient.listWorkers()` — like any connection-pooling DB client. The first method call connects (memoized); a
failed connect resets the memo so the next request retries. `connect()` is optional (explicit warm-up); `close()`
tears the connection down and lets a later call reconnect. There is no background reconnect loop and no backoff timer:
recovery is always driven by the next caller-initiated request.

| Argument | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `config.kernelKey` | Required unless `opts.transport` is set | `string \| Buffer` | None | The Kernel listener's public key |
| `config.kernelKeyPair` | Optional | `{ publicKey, secretKey } \| () => keyPair` | None | DHT keypair the client dials with, so the [Kernel allowlist](../kernel/README.md#transports) can name it; without it the caller key is random per process |
| `config.kernelBootstrap` | Optional | `array` | None | HyperDHT bootstrap list for the client's DHT node (a [private DHT](../../../docs/guides/deployment/private-dht.md)) |
| `config.kernelDhtHost` | Optional | `string` | All interfaces | Interface the client's DHT node binds |
| `config.kernelCredential` | Optional | `{ name, privateKey }` | None | The service account to sign in as (an app's `app:<name>`, or an agent). The client signs in on first use, sends the access token with every request, and renews it before it expires |
| `opts.tokenSource` | Optional | `{ getToken, reset }` | None | Any other source of access tokens, such as a user session, instead of `kernelCredential` |
| `opts.errorCode` | Optional | `string` | `'ERR_MDK_CLIENT_UNAVAILABLE'` | Overrides the rejection code every request-issuing method throws when there's no connection. Not validated against the [documented error codes](#errors): any string is accepted, since a Gateway plugin commonly passes its own code instead. |
| `opts.timeout` | Optional | `number` (ms) | `30000` | Default per-request timeout. Every method also takes a trailing `{ timeout }` to override it for one call (see [Request timeouts](#request-timeouts)) |
| `opts.transport` | Required unless `config.kernelKey` is set | `object` | None | Pre-built transport (`{ connect, close, request }`). Test seam — satisfies the `kernelKey` requirement instead. |

The Kernel authorizes every request by its access token, against `spec.rbac`. A request it refuses for authorization
throws, with the code as `err.code`: `ERR_KERNEL_TOKEN_REQUIRED` (no credential or token source),
`ERR_KERNEL_TOKEN_INVALID` (retried once with a fresh token first), `ERR_KERNEL_ACTOR_INVALID` (the operator's token, not
retried) or `ERR_KERNEL_ACTION_FORBIDDEN` (no rule allows it). A refusal never comes back as a reply, so `res.workers || []`
cannot mistake "may not" for "there are none".

`client.withActor(accessToken)` returns the same Kernel actions acting for an operator: each request carries the operator's
access token in `envelope.actor` beside the client's own, and the Kernel allows it only when `spec.rbac` allows both. It is
synchronous on both client forms, shares the connection, and has no `connect`, `close` or way to read the token back. An app
runtime hands it to controllers as `req.mdk` (see [`@tetherto/mdk-app-runtime`](../app-runtime/README.md)), so app code
rarely calls it directly.
Every other Kernel error is still a `{ error }` reply.

A host booted without a reachable Kernel keeps its routes up and fails per request with `opts.errorCode`, rather than
failing to boot. A request that fails without an `ERR_*` code is rejected as `opts.errorCode` (default
`ERR_MDK_CLIENT_UNAVAILABLE`), keeping the original failure as the error's `cause`; an error that already carries an
`ERR_*` code passes through unchanged.

### `createRawMdkClient(opts)` → client

The low-level factory `createMdkClient` wraps: opens a persistent connection and exposes the same method surface,
but the caller owns the lifecycle — call `connect()` before the first request. Use it directly for explicit
lifecycle control (an up-front warmup, a test transport) rather than [`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client)'s
ambient-config, auto-connecting form.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `opts.hrpc` | Required unless `opts.transport` is set | `object` | None | HRPC transport opts: `{ key, keyPair?, seed?, bootstrap?, dhtHost?, timeout?, envelope?, dht?, rpc? }`. `dhtHost` is the interface the client's DHT node binds. `key` is the Kernel listener **or** a Worker's RPC public key (hex string or Buffer). `keyPair` (a DHT keypair or a function returning one) pins the identity the client dials with, so the Kernel allowlist can name it. `timeout` is the default per-request timeout in ms (`30000`). `envelope: true` validates every reply as an MDK response envelope (set by `createWorkerClient`) |
| `opts.transport` | Required unless `opts.hrpc` is set | `object` | None | Pre-built transport (`{ connect, close, request }`). Test seam — satisfies the `hrpc` requirement instead. |

Throws one of the [documented error codes](#errors): `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` or `ERR_MDK_CLIENT_HRPC_KEY_REQUIRED`.

### `createWorkerClient(rpcKey, hrpcOpts?)` → client

Use this for a direct, persistent connection to one Worker — several calls over its lifetime rather than a single
request. Requires the Worker's RPC public key — resolve it with
[`getWorkerKey`](#getworkerkeyworkerid--promisestring--null). Wraps `createRawMdkClient`, so `connect()` is explicit,
same as that factory.

Same client surface as `createMdkClient`; scoped to ops the Worker adapter handles directly (`registerThing`,
`forgetThings`, …) rather than Kernel contract commands. `hrpcOpts` forwards `keyPair`/`seed`/`bootstrap`/`dhtHost`/`timeout`/`dht`/`rpc`
to the transport. Worker replies are checked with the protocol's `validate()`: anything that is not a well-formed
response envelope rejects with `ERR_MDK_RESPONSE_INVALID`, and a bare `{ error: 'ERR_*' }` reply (for example
`ERR_WORKER_CALLER_NOT_ALLOWED`) rejects with that code.

> [!IMPORTANT]
> Workers admit only allowlisted caller keys, and `mdk run` and the `@tetherto/mdk-core` helpers admit the Kernel's key
> alone. A caller reaches a Worker directly only after the operator adds its key to that Worker's `allowedKeys` (or
> `MDK_WORKER_ALLOWED_KEYS`). Called on its own, `createWorkerClient` dials with the identity in `hrpcOpts`
> (`keyPair`/`seed`), or a random one if none is given, which no Worker allowlist will name. Pass the same `keyPair` the
> Worker admits.

> [!NOTE]
> [`sendWorkerCommand`](#sendworkercommandworkerid-deviceid-command-params-opts--promiseobject) and
> [`pullWorkerTelemetry`](#pullworkertelemetryworkerid-query-opts--promiseobject) build one of these internally per call
> and close it. Call those for a single request.

```js
const { createWorkerClient } = require('@tetherto/mdk-client')
const wc = createWorkerClient(workerRpcKey)
await wc.connect()
await wc.sendCommand('wm-001', 'registerThing', params)
await wc.close()
```

### Client methods

#### `connect(opts?)` → `Promise<void>`

Open the connection to Kernel (or the Worker). Required before any other method on a `createRawMdkClient`/
`createWorkerClient` client; optional on a `createMdkClient` client, which connects itself on first use — call it
explicitly only for an up-front warmup.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `warmup` | Optional | `boolean` | `false` | Issue a best-effort `listWorkers()` after connecting to absorb the first-request DHT-route flake, so the first *real* request (including commands) is stable. Never throws — a failed warmup is swallowed. |
| `warmupRetries` | Optional | `number` | `3` | Warmup attempts |
| `warmupDelayMs` | Optional | `number` | `600` | Delay between warmup attempts |

`connect()` with no arguments behaves exactly as before (resolves once the transport connects; issues no request).

#### `close()` → `Promise<void>`

Close the connection.

#### `getStatus(opts?)` → `Promise<{ workers, totalDevices }>`

Read-only status aggregator over `listWorkers()` with built-in **first-request retry** and a timeout. Safe to retry because it only reads.
Returns a stable, shaped result for tooling.

```js
const { workers, totalDevices } = await client.getStatus()
// workers: [{ workerId, state, healthState, deviceIds, deviceCount, rpcKey }]
```

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `retries` | Optional | `number` | `3` | Attempts before giving up |
| `retryDelayMs` | Optional | `number` | `600` | Delay between attempts |
| `timeoutMs` | Optional | `number` | `8000` | Per-attempt timeout; rejects with `ERR_MDK_STATUS_TIMEOUT` |

#### `listWorkers()` → `Promise<{ workers }>`

Raw `WORKER_LIST` response from the Kernel registry. Prefer `getStatus()` for the shaped, retry-wrapped form.

```js
const { workers } = await client.listWorkers()
// workers: [{ workerId, state, deviceIds, healthState, rpcKey }]
```

#### `waitForWorkers(opts?)` → `Promise<worker[]>`

Poll `getStatus()` until `count` Workers are READY, then resolve the matching Workers. Out-of-process readiness wait for callers holding
only the Kernel key (the in-process equivalent is `@tetherto/mdk-core`'s `waitForDiscovery`). Throws `ERR_MDK_WAIT_WORKERS_TIMEOUT` on timeout.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `count` | Optional | `number` | `1` | Number of READY Workers to wait for |
| `requireDevices` | Optional | `boolean` | `true` | Only count Workers with ≥1 device |
| `timeoutMs` | Optional | `number` | `30000` | Overall timeout |
| `intervalMs` | Optional | `number` | `1000` | Poll interval |

#### `waitForDevice(deviceId, opts?)` → `Promise<true>`

Poll until `deviceId` appears in the Kernel registry (optionally under a specific `workerId`). Used after provisioning to confirm the device synced.
Throws `ERR_MDK_WAIT_DEVICE_TIMEOUT` on timeout.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `workerId` | Optional | `string` | `null` | Restrict the match to this Worker |
| `timeoutMs` | Optional | `number` | `30000` | Overall timeout |
| `intervalMs` | Optional | `number` | `1000` | Poll interval |

#### `getCapabilities(deviceId)` → `Promise<{ capabilities }>`

Fetch the `mdk-contract.json` capabilities for a device as declared by its Worker.

#### `pullTelemetry(deviceId, queryType?)` → `Promise<object>`

Pull telemetry from the Worker managing the given device. `queryType` defaults to `'metrics'`, and may be a string or a full query
object (`{ type, key, tag, start, end, limit, ... }`).

Available query types:

| Type | Returns |
|------|---------|
| `metrics` | Live hashrate, power, temperature, fan speeds |
| `list` | All registered devices |
| `count` | Device count |
| `logs` | Recent log entries |
| `logs_multi` | Logs for multiple devices |
| `historical_logs` | Historical log query |
| `settings` | Worker settings |
| `config` | Worker config |
| `thing_config` | Individual device config |
| `stats` | Aggregated statistics |
| `ext_data` | Extended device data |

#### `pullState(deviceId)` → `Promise<object>`

Fetch a snapshot of the Worker's state machine status for the given device.

#### `sendCommand(deviceId, command, params?)` → `Promise<object>`

Dispatch a command to the Worker managing `deviceId`. When the client is connected to the **Kernel**, the command must be declared in
the Worker's `mdk-contract.json`. When connected **directly to a Worker** (see `createWorkerClient`), this also reaches adapter-handled
ops like `registerThing`/`forgetThings`. Commands are **never auto-retried** (the Kernel, not the transport, removes duplicate command IDs).

```js
await client.sendCommand('wm-001', 'reboot', {})
await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })
await client.sendCommand('wm-001', 'setupPools', {
  pools: [{ url: 'stratum+tcp://pool.example.com:3333', user: 'worker1', pass: 'x' }]
})
```

**Return value:** the Kernel's acceptance, not the command's outcome. Read the outcome with `getCommandStatus`.

| Field | Type | Description |
| --- | --- | --- |
| `commandId` | `string` | Correlation ID generated by Kernel. Pass it to `getCommandStatus`. |
| `status` | `string` | `'QUEUED'` when Kernel accepted the command, `'REJECTED'` when it did not |
| `error` | `string` | Why the command was rejected (present when `status` is `'REJECTED'`): an undeclared command (`ERR_COMMAND_NOT_IN_CAPABILITIES`) or params that break the contract's rules (`ERR_PARAM_*`) |

```js
const res = await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })
// res.commandId  — 'a3f7...'
// res.status     — 'QUEUED'
```

#### `getCommandStatus(commandId)` → `Promise<object>`

Read a command's state from Kernel while it runs and for `kernel.commandResultTtlMs` (default 24 h) after it settles.

| Field | Type | Description |
| --- | --- | --- |
| `status` | `string` | `QUEUED`, `DISPATCHED`, `EXECUTING`, `SUCCESS`, `FAILED` or `TIMEOUT` (sent, outcome unconfirmed) |
| `result` | `object \| null` | The Worker's result on `SUCCESS` |
| `error` | `string \| null` | Why it failed or timed out |
| `verification` | `object \| null` | Device-state readback: `{ state, telemetry, expected, observed, at }`, `state` one of `PENDING`, `VERIFIED`, `UNVERIFIED`, `NOT_DECLARED` |

`SUCCESS` means the Worker's handler returned; only `verification.state === 'VERIFIED'` means telemetry shows the device in the requested
state. A command is read back only when its contract entry declares `verify` (see [Build a Worker](../../../docs/guides/workers/build-a-worker.md)).

```js
const { commandId } = await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })
const res = await client.getCommandStatus(commandId)
// res.status       — 'SUCCESS'
// res.verification — { state: 'VERIFIED', telemetry: 'power_mode', expected: 'low', observed: 'low', at: 1792158359941 }
```

#### `getCommandLog({ start?, end?, limit? })` → `Promise<{ entries }>`

Read the Kernel's [write-command log](../kernel/README.md#write-command-log), newest first: every `command.request` attempt with
its caller, target, redacted params and outcome, and each accepted command's terminal state. `start`/`end` bound the entry time
in ms (inclusive); `limit` is 1 to 1000 (default 100). Needs the `admin` role (`ERR_KERNEL_ACTION_FORBIDDEN` otherwise).

```js
const { entries } = await client.getCommandLog({ limit: 20 })
// [{ ts, event: 'attempt', commandId, caller: { key, roles }, command, scope, deviceId, workerId, targets, params, outcome, error }, ...]
```

#### `getWorkerKey(workerId)` → `Promise<string | null>`

Resolve a Worker's RPC public key (hex) from the Kernel registry (the Kernel learned it via discovery), or `null` if the Worker isn't
registered. Pair with `createWorkerClient`/`sendWorkerCommand` for Worker-direct ops.

#### `sendWorkerCommand(workerId, deviceId, command, params?, opts?)` → `Promise<object>`

Send a Worker-direct command (e.g. `registerThing`) by `workerId` in one call: resolve the Worker's key via the Kernel, open a
short-lived Worker client, send, and close it. Returns the command response. Throws `ERR_MDK_WORKER_KEY_UNKNOWN` if the Worker
isn't in the registry. The Worker client inherits this client's identity: it reuses the parent's DHT node once the
parent is connected (otherwise its `kernelKeyPair`/`seed`/`bootstrap`/`dhtHost`) and its default timeout, so a Worker whose
allowlist names the `kernelKeyPair` public key admits it. `opts.hrpc` overrides the transport opts (passing
`keyPair`/`seed`/`rpc`/`dht` replaces the inherited identity); `opts.timeout` sets this call's timeout.

```js
// Provision a device on a running Worker, then wait for the Kernel to sync it.
const res = await client.sendWorkerCommand('miner-worker', 'wm-007', 'registerThing', params)
await client.waitForDevice('wm-007', { workerId: 'miner-worker' })
```

#### `pullWorkerTelemetry(workerId, query, opts?)` → `Promise<object>`

Pull telemetry from a Worker directly, scoped to the Worker itself rather than one device — for Worker-infra query
types (`logs`, `logs_multi`, `list`, `stats`, `ext_data`) that aggregate over the Worker's own store. Resolves the
Worker's key via the Kernel registry, opens a short-lived Worker client, and closes it. Resolves with the bare
payload, like the Kernel-side helpers. Throws `ERR_MDK_WORKER_KEY_UNKNOWN` if the Worker isn't in the registry.
Inherits this client's identity and timeout exactly like `sendWorkerCommand`; `opts.hrpc` and `opts.timeout` work the
same way.

```js
const history = await client.pullWorkerTelemetry('miner-worker', { type: 'logs', key: 'stat-1D', tag: 't-miner', start, end })
```

#### `terminateWorker(workerId)` → `Promise<object>`

Signal Kernel to evict a Worker from the registry. The Worker process itself continues running; it re-registers the next time it connects.

#### `getRbac()` → `Promise<{ record }>`

Read the [RBAC](../rbac/README.md) record the Kernel enforces: `{ version, appliedAt, source, previous, policy }`, or `null` when no
policy was ever applied. Needs an `admin` caller.

#### `applyRbac(rbac)` → `Promise<object>`

Apply `spec.rbac` (`null` for no policy, which denies everything). Resolves `{ changed, version, appliedAt, previous? }`, or
`{ error, errors }` listing every problem when the Kernel refuses the policy and keeps the one in force. Needs an `admin` caller.

### Sign-in methods

These call the Kernel's [token issuer](../identity/README.md). Each sign-in resolves
`{ tokenType, accessToken, expiresIn, refreshToken, refreshExpiresIn }`, or `{ error }` with an `ERR_IDENTITY_*` code.

| Method                                    | Sends          | Does                                                                                   |
| ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| `login(username, password)`               | `auth.login`   | Password sign-in for a user                                                            |
| `refreshToken(refreshToken)`              | `auth.refresh` | Trades a refresh token for new tokens; the old one is used up                          |
| `serviceAccountToken(assertion, { bind })` | `auth.token`  | Service-account sign-in; tokens bind to this client's key unless `bind: false`         |
| `logout(refreshToken)`                    | `auth.logout`  | Ends the session: `{ revoked }`                                                        |
| `getJwks()`                               | `auth.jwks`    | The issuer's public keys for verifying access tokens: `{ keys }`                       |

### Identity administration methods

Each needs an `admin` caller.

| Method                                     | Sends                  | Resolves                                  |
| ------------------------------------------ | ---------------------- | ----------------------------------------- |
| `listUsers()`                              | `identity.user.list`   | `{ users }`, without password hashes      |
| `upsertUser({ name, email, groups, password, disabled })` | `identity.user.upsert` | `{ created, user }`        |
| `deleteUser(name)`                         | `identity.user.delete` | `{ deleted }`                             |
| `listServiceAccounts()`                    | `identity.sa.list`     | `{ serviceAccounts }`                     |
| `upsertServiceAccount({ name, publicKey })` | `identity.sa.upsert`  | `{ created, changed, serviceAccount }`    |
| `deleteServiceAccount(name)`               | `identity.sa.delete`   | `{ deleted }`                             |
| `rotateSigningKey()`                       | `identity.keys.rotate` | `{ kid }`                                 |

### Write-action methods

The write-action methods wrap the `action.*` protocol envelope set and call through to the Kernel's `ActionManager`. They bypass the Gateway auth
layer — the caller is responsible for its own access control.

> [!NOTE]
> [React hook equivalents are available](../../../docs/concepts/control-plane.md#developer-surfaces).

#### `pushAction(opts)` → `Promise<object>`

Stage a single write action for approval. `opts`: `{ query, action, params, voter, authPerms, batchActionUID }`.

#### `pushActionsBatch(opts)` → `Promise<object>`

Stage a batch of write actions in one envelope. `opts`: `{ batchActionsPayload, voter, authPerms, batchActionUID, suffix }`.

#### `getAction({ id, type })` → `Promise<object>`

Fetch a single staged action by `id` and `type` (for example `'voting'`).

#### `getActionsBatch({ ids })` → `Promise<object>`

Fetch multiple staged actions by an array of ids.

#### `queryActions(opts)` → `Promise<object>`

Query staged actions with MongoDB-style filter expressions. `opts`: `{ queries, suffix, groupBatch }`.

#### `voteAction(opts)` → `Promise<1>`

Cast an approve or reject vote on a staged action. `opts`: `{ id, voter, approve, authPerms }`. Kernel checks the required
device-family permissions (`miner:w`, `container:w`, etc.) from `authPerms` before recording the vote.

#### `cancelActionsBatch(opts)` → `Promise<object[]>`

Cancel one or more staged actions by ids. `opts`: `{ ids, voter }`.

## Errors

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_MDK_CLIENT_UNAVAILABLE` | `createMdkClient`'s `config.kernelKey` is missing, connecting failed, or a request could not reach the Kernel | Supply `config.kernelKey` (or `opts.transport`), or check Kernel connectivity |
| `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` | `createRawMdkClient` called with neither `opts.hrpc` nor `opts.transport` | Pass one of them |
| `ERR_MDK_CLIENT_HRPC_KEY_REQUIRED` | `createRawMdkClient({ hrpc: {...} })` called without `hrpc.key` | Pass the Kernel's or a Worker's public key as `hrpc.key` |
| `ERR_MDK_CLIENT_ACTOR_REQUIRED` | `withActor()` is called without an access token string | Pass the operator's access token |
| `ERR_MDK_CLIENT_NO_SUCH_METHOD` | A `createMdkClient` call names a property that isn't an own method of the raw client (inherited members such as `constructor` or `toString` included) | Check the method name |
| `ERR_HRPC_NOT_CONNECTED` | A `createRawMdkClient`/`createWorkerClient` client's request-issuing method (not e.g. `close()`) is called before `connect()` has run, or after `close()` | Call `connect()` first |
| `ERR_MDK_REQUEST_TIMEOUT` | A request got no reply within its timeout (default `30000` ms, `opts.timeout` / `hrpc.timeout`, or a per-call `{ timeout }`) | Check the peer's reachability, or raise the timeout for slow calls |
| `ERR_MDK_CLIENT_TIMEOUT_INVALID` | A `timeout` option is not a positive finite number of milliseconds | Pass a positive number |
| `ERR_MDK_RESPONSE_INVALID` | A reply is not valid JSON, or (Worker clients) not a well-formed MDK response envelope; the message carries the reason (e.g. `ERR_ENVELOPE_ID_MISSING`) | Check that the key belongs to an MDK Worker on a compatible protocol version |
| `ERR_MDK_STATUS_TIMEOUT` | `getStatus()`'s per-attempt timeout elapsed without Kernel answering `listWorkers()` | Increase `timeoutMs`, or check Kernel reachability |
| `ERR_MDK_WAIT_WORKERS_TIMEOUT` | `waitForWorkers()` gave up: fewer than `count` Workers were READY (and, since `requireDevices` defaults `true`, had at least one device) within `timeoutMs` | Increase `timeoutMs`, or lower `count`, or confirm the Workers are actually starting with devices |
| `ERR_MDK_WAIT_DEVICE_TIMEOUT` | `waitForDevice()` gave up: `deviceId` never appeared in the Kernel registry within `timeoutMs`, optionally scoped to a specific `workerId` | Confirm the device is being provisioned (on that Worker, if `workerId` was passed); increase `timeoutMs` |
| `ERR_MDK_WORKER_KEY_UNKNOWN` | `sendWorkerCommand`/`pullWorkerTelemetry` called with a `workerId` the Kernel registry doesn't know | Confirm the Worker is running and registered |

## Request timeouts

Every request is bounded. The default is 30 seconds (`DEFAULT_TIMEOUT_MS` in `lib/hrpc-client.js`); set another
default with `createMdkClient(config, { timeout })` or `hrpc.timeout`, and override it for one call with a trailing
options argument:

```js
await mdkClient.listWorkers({ timeout: 5000 })
await mdkClient.sendCommand('wm-001', 'reboot', {}, { timeout: 60000 })
await mdkClient.pushAction({ query, action, params, voter, authPerms }, { timeout: 10000 })
await mdkClient.sendWorkerCommand('miner-worker', 'wm-007', 'registerThing', params, { timeout: 10000 })
```

A request that runs out of time rejects with `ERR_MDK_REQUEST_TIMEOUT`. `getStatus({ timeoutMs })` passes its
per-attempt timeout to the request as well.

## Transport details

HRPC is the only transport: each request is an independent `@hyperswarm/rpc` call to the listener's `mdk` responder, so concurrent requests are
multiplexed by the RPC layer (no FIFO queue). The same transport addresses the Kernel listener or any Worker's RPC server by public key.
The first request after `connect()` can flake while the DHT route settles — use `getStatus()` (built-in retry) or `connect({ warmup: true })`.

Every message is a fully formed MDK Protocol envelope and the model is request/response (one response per request).

### Connection recovery and command outcomes

After a pooled HRPC connection closes, a later call establishes a new connection to the same public key as needed. This requires
the peer and DHT network to be reachable; reconnection does not guarantee that the next call succeeds. The caller handles failed
requests. Ordinary client calls do not automatically retry a failed request; `getStatus()` has its own bounded retry loop.

Reconnecting does not replay a request that failed. A lost response also does not prove that a command failed to execute.
Kernel's [command lifecycle](../kernel/README.md#commandstatemachine) records commands durably and marks a Worker send that times out
or errors as `TIMEOUT` with `ERR_COMMAND_UNCONFIRMED`, without resending it. A caller reconciles an unconfirmed command by reading
the device state back. These command records are separate from the transport: HRPC does not provide an offline delivery queue.

## Use in an app

Every app builds its own client from its own context, once per app, in a `lib/client.js` every
controller in the app requires, as the shipped [`demo` app](https://github.com/tetherto/mdk-app-demo/blob/main/lib/client.js) does:

```js
// lib/client.js
const { createMdkClient } = require('@tetherto/mdk-client')
const { config } = require('@tetherto/mdk-gateway/plugin')

module.exports = createMdkClient(config, { errorCode: 'ERR_KERNEL_CLIENT_NOT_CONNECTED' })
```

If you are writing a custom Gateway or a standalone tool that needs to talk to Kernel outside a plugin, `@tetherto/mdk-client`
is still the correct package — build a `kernelKey`-bearing config yourself:

```js
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ kernelKey })

// Wait for the fleet to come up, then read the site-wide device list.
await client.waitForWorkers({ count: 4 })
const { workers } = await client.getStatus()
const allDeviceIds = workers.flatMap(w => w.deviceIds)
```

## Directory layout

```text
client/
├── index.js              # Exports createMdkClient, createWorkerClient
├── lib/
│   └── hrpc-client.js     # HRPCClient — @hyperswarm/rpc transport (by key)
└── tests/
    └── unit/              # One suite per lib module + client-facing behavior
```

## Next steps

- [Run Kernel and the Gateway](../../../docs/guides/gateway/run.md) — Kernel must be running before `client.connect()` can succeed
- [Understand how an app builds its own `mdk-client` and what the Gateway adds around it](../gateway/README.md#extend-the-gateway)
- [Understand the MDK Protocol and Kernel's role as the kernel](../../../docs/concepts/architecture.md)
- [MVP site example](../../../examples/mvp-site/README.md) — see `createMdkClient` used end-to-end with Kernel and Workers
- [`startGateway()` option reference](../mdk/README.md) — if you are wiring `mdk-client` into a custom Gateway
- [Restrict Kernel callers](../../../docs/guides/security/index.md): the allowlist that names this keypair
