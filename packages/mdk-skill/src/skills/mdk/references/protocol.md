# MDK protocol

Load this before writing anything that builds, sends, or answers an envelope.
Source of truth: [`backend/core/kernel/lib/protocol/`](../../../../../../backend/core/kernel/lib/protocol/) ([`actions.js`](../../../../../../backend/core/kernel/lib/protocol/actions.js),
[`envelope.js`](../../../../../../backend/core/kernel/lib/protocol/envelope.js), [`schemas.js`](../../../../../../backend/core/kernel/lib/protocol/schemas.js)). Protocol version: `0.2.0`.

## The envelope

Every message between Kernel and Workers is exactly this object — nine fields,
no more:

```js
{
  id: 'uuid',              // per-message id (crypto.randomUUID())
  version: '0.2.0',        // PROTOCOL_VERSION
  type: 'request',         // 'request' | 'response' | 'event'
  action: 'telemetry.pull',// one of ACTIONS below
  sender: 'kernel:shard-1',// sender identity string
  target: null,            // receiver identity, or null
  deviceId: 'miner-42',    // addressed device, or null for Worker-scoped
  timestamp: 1750000000000,// Date.now()
  payload: {}              // ALL action-specific data goes here
}
```

**Never add transport-level fields — extend `payload`.** Envelopes are
validated structurally (`ERR_ENVELOPE_*`) and, per action, by payload
validators in [`schemas.js`](../../../../../../backend/core/kernel/lib/protocol/schemas.js) (`ERR_PAYLOAD_*`); unknown actions are rejected
with `ERR_ENVELOPE_ACTION_UNKNOWN`. On the wire an envelope is
JSON-serialized to a Buffer and sent over the `'mdk'` HRPC method.

Build responses with `buildResponse(requestEnvelope, action, payload, sender)`
— it flips `target` to the request's `sender` and carries `deviceId` over.

## Action set ([`actions.js`](../../../../../../backend/core/kernel/lib/protocol/actions.js))

| Direction | Request → Response | Purpose |
| --- | --- | --- |
| Kernel → Worker | `identity.request` → `identity.response` | Worker id + device list |
| Kernel → Worker | `capability.request` → `capability.response` | Published `mdk-contract.json` (handler paths stripped) |
| Kernel → Worker (scheduled) | `telemetry.pull` → `telemetry.response` | Read metrics/channels |
| Kernel → Worker (scheduled) | `state.pull` → `state.response` | Device online/offline snapshot |
| Client → Kernel → Worker | `command.request` → `command.result` | Execute a device command |
| Client → Kernel | `command.status` → `command.status.response` | Query command lifecycle |
| Client → Kernel | `command.cancel` → `command.cancel.response` | Cancel a pending command |
| Kernel → Worker (scheduled) | `health.ping` → `health.pong` | Liveness |
| Gateway → Kernel only | `worker.list`, `device.capabilities`, `worker.terminate` | Kernel queries (never forwarded to Workers) |
| Gateway → Kernel | `action.push`, `action.push-batch`, `action.get`, `action.get-batch`, `action.query`, `action.vote`, `action.cancel-batch` | Write-action approval lifecycle |
| Kernel → Worker | `write.calls.request` → `write.calls.response` | Write-call resolution (only when worker-infra services are injected) |

Also defined there: `COMMAND_SCOPES` (`device` | `worker` | `rack`),
`MESSAGE_TYPES`, and `VALID_COMMAND_RESULT_STATUSES`
(the command state machine's states plus `REJECTED`).

## Reads: `telemetry.pull`

Payload shape: `{ query: { type, ...params } }`, `deviceId` in the envelope.
`type` selects what a Worker returns (dispatch in
[`backend/core/mdk-worker/lib/worker-runtime.js`](../../../../../../backend/core/mdk-worker/lib/worker-runtime.js) `_handleTelemetry`):

- `type: 'metrics'` (default) — runs **every** declared telemetry handler for
  the addressed device: `{ deviceId, metrics: { <name>: value, … }, timestamp }`.
  With no `deviceId`, returns `{ devices: [{ deviceId, metrics|error }…] }`.
- `type: 'list'` — `{ devices: [{ deviceId, status }] }` (no device needed).
- `type: '<channel>'` — any single declared telemetry name, with the rest of
  `query` passed to the handler as params:
  `{ query: { type: 'history', limit: 3 } }` → `{ name, value }`.
- Worker-infra built-in types (`logs`, `settings`, `stats`, `config`, …) are
  served from injected services before plugin channels are consulted.

Per-field handler errors come back inside the payload
(`metrics.<name> = { error }`); an offline device yields
`ERR_DEVICE_UNAVAILABLE`, an unknown channel `ERR_UNKNOWN_QUERY_TYPE`.

## Writes: `command.request`

Payload: `{ commandId, command, params }`, `deviceId` in the envelope.
The **Kernel's dispatcher validates before dispatch**
([`backend/core/kernel/lib/modules/command-dispatcher/index.js`](../../../../../../backend/core/kernel/lib/modules/command-dispatcher/index.js)):
the command must appear in the Worker's declared capabilities
(`ERR_COMMAND_NOT_IN_CAPABILITIES`), params must match declared types
(`ERR_PARAM_TYPE`), and numeric params must be within declared `min`/`max`
(`ERR_PARAM_RANGE`). Bounds you do not declare are NOT enforced anywhere.

The Worker answers `command.result` with
`{ commandId, status: 'SUCCESS', result }` or
`{ commandId, status: 'FAILED', error }`. Handler exceptions become `FAILED`
with the error message — so throw `ERR_*`-prefixed errors from handlers.

## Error string convention

Errors travel as `SCREAMING_SNAKE_CASE` strings prefixed `ERR_`, optionally
suffixed with context after a colon (`ERR_DEVICE_NOT_FOUND: miner-42`). Device
error codes a Worker can emit belong in the contract's `capabilities.errors`
map.
