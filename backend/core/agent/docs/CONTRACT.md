# Agent event contract (`v1`)

The typed stream every agent turn produces and every consumer reads. One vocabulary, three
front doors: the **CLI** consumes it in-process, the **Gateway** re-serializes it as Server-Sent
Events (SSE), the **UI** renders it. Nobody re-implements agent logic — they render a fixed set
of events.

The definitions live in [`src/events.js`](../src/events.js) as a zod discriminated union, which also
carries the `CONTRACT_VERSION` this page documents. The package exports the three a consumer builds
against: `EVENT`, `isTerminal` and `AgentEventSchema`. Switch on `EVENT.*`, never on the raw strings.
The gateway validates events at the SSE boundary with `AgentEventSchema.safeParse(ev)`.

## The six events (agent → consumer)

```ts
type AgentEvent =
  | { type: 'token';            text: string }                  // a chunk of the answer
  | { type: 'tool_call';        name: string; args: object }    // model chose a tool
  | { type: 'tool_result';      name: string; text: string; isError?: boolean; contractViolation?: string; approvalWaitMs?: number }
  | { type: 'pending_approval'; name: string; args: object }    // write — stream PAUSES
  | { type: 'error';            error: string }                 // terminal
  | { type: 'done';             text?: string; usage?: object } // terminal
```

| Event | Meaning | UI treatment |
|---|---|---|
| `token` | Streaming answer prose (concatenated tokens === the final answer) | Append to bubble |
| `tool_call` | The model chose a tool | Show `→ name(args)` |
| `tool_result` | The tool executed; `isError` flags failure, `contractViolation` says the result broke its verb's contract, `approvalWaitMs` is how long the operator held it at the prompt | `← …`, red if error; subtract `approvalWaitMs` before showing a duration |
| `pending_approval` | A **write** needs a human decision | **Modal, blocks** |
| `error` | The turn failed | Error state (≠ decline) |
| `done` | The turn completed | Finalize; latency from `usage` |

## Invariants (guarantees consumers can rely on)

1. **Exactly one terminal event per turn** — `done` OR `error`, never both, always last
2. **`tool_result` always follows its `tool_call`** (same `name`); may repeat for multi-step turns
3. **`pending_approval` appears only for declared write tools**, and only between a `tool_call`
   and its `tool_result`
4. **A decline is `token`s + `done`** with no `tool_call` — distinguish it from `error`
5. **Unknown event types MUST be ignored, not thrown on** — this is what lets us add event
   types later without a breaking release
6. **The producer emits `contractViolation` only with `isError: true`**, and its value is a
   non-empty reason. Its presence means the tool answered and the answer broke its verb's
   contract; its absence with `isError: true` means the call itself failed. Like 1–4, this is a
   guarantee about what is emitted, not something `safeParse` checks — the schema pins the
   field's presence and type, never its co-occurrence with `isError`

## The approval round-trip (bidirectional)

In-process the decision flows back through the generator (`iter.next(approved)`). SSE is
server→client only, so over the wire the decision needs a **second request**. The stream stays
open and paused at `pending_approval` until it arrives.

```
stream:  … → pending_approval(approvalId) → [paused] → tool_result → token → done
decision: POST /agent/turns/{turnId}/approvals/{approvalId}   { "approved": true }
```

**Fail-safe:** no decision within the approval timeout ⇒ treated as **reject** — the write never
runs. `approved:false` ⇒ `tool_result` = `(rejected by operator — not executed)`, then an
acknowledgement token and `done`.

## Wire envelope (Gateway ↔ FE only)

The **library emits pure `AgentEvent`s** (above). The **Gateway** adds a transport envelope when
serializing to SSE — the library never stamps these:

```ts
interface WireEvent /* extends AgentEvent */ {
  turnId: string      // correlates all events of one turn
  seq: number         // monotonic per turn — ordering + reconnect dedup
  approvalId?: string // present ONLY on pending_approval — echo it back to decide
  ts?: number         // optional, for latency telemetry
}
```

Raw SSE framing the FE parses (via `fetch` + a stream reader, not `EventSource`, since the
message is a POST body):

```
event: tool_call
data: {"turnId":"t7","seq":0,"type":"tool_call","name":"count_devices","args":{"state":"offline"}}

event: token
data: {"turnId":"t7","seq":1,"type":"token","text":"1 miner is offline."}

event: done
data: {"turnId":"t7","seq":2,"type":"done"}
```

## Worked examples

**Read — "how many miners are offline?"**
```json
{"type":"tool_call","name":"count_devices","args":{"family":"miner","state":"offline"}}
{"type":"tool_result","name":"count_devices","text":"{\"summary\":\"1 offline\"}","isError":false}
{"type":"token","text":"1 miner is offline."}
{"type":"done","text":"1 miner is offline."}
```

**Write — "restart antminer-3"** (approved)
```json
{"type":"tool_call","name":"act_device","args":{"ref":"antminer-3","action":"reboot"}}
{"type":"pending_approval","name":"act_device","args":{"ref":"antminer-3","action":"reboot"}}
// … POST the decision {approved:true} …
{"type":"tool_result","name":"act_device","text":"{\"status\":\"SUCCESS\"}","isError":false}
{"type":"token","text":"Done — antminer-3 is rebooting."}
{"type":"done"}
```

**Decline — "site energy cost?"** (no tool call)
```json
{"type":"token","text":"I don't have that ability yet — I can give you fleet counts and status."}
{"type":"done"}
```

## Versioning

`CONTRACT_VERSION` bumps only on a **breaking** change. Additive fields within a major are
allowed; new event types are additive because consumers ignore unknown types (invariant 5).
