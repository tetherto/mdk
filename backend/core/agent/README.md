# @tetherto/mdk-agent

A conversational operator agent for MDK: a small library + CLI that answers plain-language
questions about a mining fleet. It runs on a **local** model (QVAC) and calls **MDK fleet
tools over MCP** — it never invents fleet data, and write actions require human approval.

The model routes and narrates; the tools compute. Nothing leaves the machine.

> [!NOTE]
> This page is reference: the model, the CLI flags, the capability budgets, and the session-store contract. For a
> walkthrough that runs it end to end, see [Run the agent as a standalone CLI](../../../docs/guides/agent/run-standalone.md).
> In production, this agent is deployed behind the Gateway by [`@tetherto/mdk-plugin-agent`](../../plugins/agent/README.md),
> which mounts it as a chat API instead; the [agent guide chooser](../../../docs/guides/agent/index.md) covers both paths.

## Prerequisites

- Node.js ≥ 24
- npm 11 ([< 12](../../../docs/reference/environment.md#why-npm-stays-below-12))
- A GPU

> [!NOTE]
> QVAC uses **Metal on macOS** and **Vulkan 1.4+ on Linux and Windows** — never CUDA.
> On macOS and Linux, a missing GPU backend falls back to CPU (slower but workable); on Windows
> the addon loads Vulkan even for CPU inference, so a pre-1.4 runtime fails the load outright.
> `qvac doctor` reports what this host actually has.

- Dependencies installed — a single root `npm install` (or `npm run setup`) covers the whole
  monorepo, this package included; `backend/core/agent` is a root workspace member, and running
  `npm install` from inside it instead rewrites the whole install graph rather than using it

> [!NOTE]
> The root install covers talking to a model over HTTP (`--base-url`, the default). Serving one
> on this machine additionally needs `@qvac/cli` — see
> [Run the agent as a standalone CLI](../../../docs/guides/agent/run-standalone.md).

## Quickstart

Serve a model, boot the demo fleet, and start the CLI:

```bash
node bin/mdk-agent.js --model qwen3-4b --mcp-url http://127.0.0.1:3008/mcp
```

[Run the agent as a standalone CLI](../../../docs/guides/agent/run-standalone.md) walks through
serving the model and starting the demo fleet the command above assumes, plus the REPL it opens.

## Flags

| Flag           | Status   | Type      | Default    | Description                                                 |
| -------------- | -------- | --------- | ---------- | ----------------------------------------------------------- |
| `--model`      | Required for a hosted provider | `string` | `qwen3-4b` | Model id served by QVAC — the floor the budgets assume |
| `--provider`   | Optional | `string`  | `qvac`     | `qvac`, `openai`, or `openai-compatible` with an explicit `--base-url` |
| `--mode`       | Optional | `string`  | `external` | How the provider reaches the model; `external` talks to `--base-url` |
| `--base-url`   | Optional | `string`  | `http://127.0.0.1:11500/v1` | The QVAC model endpoint served locally, or the hosted endpoint |
| `--api-key`    | Optional | `string`  | None       | Hosted key, read only if the [environment variable](#talking-to-a-hosted-model) isn't set |
| `--rpm`        | Optional | `number`  | Unpaced    | Cap requests per minute against a hosted endpoint that rate limits |
| `--capability` | Optional | `string`  | `small`, or `large` for a hosted provider | Which tools are admitted and what a turn may spend |
| `--max-steps` | Optional | `number`   | From the capability | Override the step budget                           |
| `--max-output-tokens` | Optional | `number` | From the capability | Override the token budget                    |
| `--mcp-url`   | Optional | `string`   | None      | MCP tool server; omit for plain grounded chat, no tools      |
| `--eval`      | Optional | `boolean`  | Off       | Run the eval battery instead of the REPL (needs `--mcp-url`) |
| `--reps`      | Optional | `number`   | `1`       | Repetitions per question; 3+ exposes unstable routing        |
| `--only`      | Optional | `string`   | All       | Restrict the run to case ids containing this string          |
| `--tag`       | Optional | `string`   | All       | Restrict the run to cases carrying this tag                  |
| `--concurrency` | Optional | `number` | `1`       | Run this many cases at once; 6 is ~4x faster                 |
| `--out`       | Optional | `string`   | None      | Write the JSON report to this path                           |

## Talking to a hosted model

The same tools and the same contract, against any endpoint that speaks the OpenAI chat API.
Useful as a control: a low battery score against a local model is ambiguous between a wrong tool
contract and a model that is too small, and a frontier model separates the two.

```sh
export OPENAI_API_KEY=sk-…
node bin/mdk-agent.js --provider openai --model gpt-5.5 --mcp-url http://127.0.0.1:3008/mcp

# any other endpoint that speaks the same protocol
export MDK_AGENT_API_KEY=…
node bin/mdk-agent.js --provider openai-compatible \
  --base-url https://generativelanguage.googleapis.com/v1beta/openai --model gemini-3-pro
```

**The key is read from the environment first, and only then from `--api-key`.** An argument is
visible to every other process on the box via `ps` and lands in shell history, so the flag exists
for convenience, not as the recommendation. `--provider openai` reads `OPENAI_API_KEY`; every
other endpoint reads `MDK_AGENT_API_KEY`.

Prompts and tool results leave the site for the endpoint's host. The CLI says so at startup —
with the local model nothing leaves, and that difference should not have to be inferred.

If the endpoint rate limits, `--rpm 30` paces requests; retries follow the endpoint's own
`Retry-After` rather than a guess. A 429 at startup is reported and treated as reachable, since
it is the endpoint answering on a valid key for a model it recognises.

## Capability

One knob decides two things: which tools a model is shown, and what a turn of it may spend.
They are the same judgement — a model trusted with harder tools is trusted to take more steps
to use them.

| Capability | Steps | Output tokens |
| ---------- | ----- | ------------- |
| `small`    | 6     | 2048          |
| `mid`      | 8     | 4096          |
| `large`    | 10    | 8192          |

`small` is budgeted for the 4B this agent was measured on, which is also the floor: the tool
loop asks for JSON on demand and a sub-billion model does not reliably produce it.

**Nothing is inferred from the model name.** An alias, a fine-tune or a local tag says nothing
about what is behind it, and guessing upward is the direction that produces runaway turns — so a
bigger local model is declared with `--capability mid`, never detected. A hosted endpoint is the
one exception, and it is read from the provider rather than the name, because reaching for one
is already the decision to use a frontier model.

A step is one model call, not one tool call: the answer costs a step of its own. A question that
fans out over the whole fleet does not fit any of these numbers and belongs in a tool that fans
out internally, not in a larger budget.

## Measuring the agent

The battery asks the questions an operator asks, and scores routing, the answer, the result
contract and the approval gate on each. Expectations are read from the live fleet at run time,
so it works against any site.

```sh
node bin/mdk-agent.js --model qwen3-4b --mcp-url http://127.0.0.1:3008/mcp \
  --eval --reps 2 --concurrency 6 --out eval-report.json
```

259 questions × 2 reps takes about twenty minutes at `--concurrency 6`, and over an hour
without it. Use `--tag rank` or `--only decline-` while iterating.

It exits non-zero on any failure. A new tool ships with a passing report — see
[docs/TOOLS.md](docs/TOOLS.md) for the authoring pipeline. [Evaluating the agent](docs/EVALUATION.md)
covers how a run is scored, gated against a baseline, and compared across models.

## Beyond single questions

The battery opens a fresh session per question, so two things it cannot reach have their own
runners. Both need the model and an MCP server up, and neither is part of `npm test`.

```sh
node eval/threads.mjs    # 264 operator conversations, 1018 turns, one session per thread
node eval/latency.mjs    # where a turn's time goes: model, tools, time to first token
```

[`threads.mjs`](./eval/threads.mjs) is what a conversation exposes and a single question does not: pronouns and
back-references, an action following a question, and drifting out of scope mid-thread. It
writes a transcript per turn and flags device ids an answer names that the turn's tools never
returned — which is how "does it hallucinate" becomes a number rather than an impression.

> **WSL note:** if you run the agent inside WSL while the model runs on Windows, use
> [`./run.sh`](./run.sh) instead of `node` — it forces the native Linux node the deps were built with.

## Without the demo

Point `--mcp-url` at any MCP server that exposes MDK-style tools, or omit it entirely for a
plain grounded chat against the model with no fleet access.

## Reclaiming the KV cache

From 0.9.0 `qvac serve` caches each conversation's attention state to
`~/.qvac/kv-cache`, which is what makes a follow-up model call skip prefill. Each entry is
a dump of the KV tensors — **~144 MB** for a 1.7k-token conversation — and the server
writes one per conversation and never removes any. The runtime's own `deleteCache()` is an
in-process RPC that the HTTP API does not expose, so nothing reclaims this on its own.

Run the reaper **where `qvac serve` runs** — the cache is the server's disk, and in the
shared-inference shape that is a different machine from the agent:

```bash
node bin/qvac-cache-reaper.js --ttl 24h --dry-run              # see what would go
node bin/qvac-cache-reaper.js --ttl 6h --interval 30m --quiet  # or leave it sweeping
```

`--help` lists the rest.

Evicting a live entry is safe: the next turn misses the cache and re-prefills, costing
latency and never correctness.

A directory holding no data is usually an aborted turn, but the server creates a
conversation's directory before it writes the blob — so a brand-new empty one may be a turn
still in flight. Those are left alone until they are older than `--empty-grace` (default 5m).
An entry whose files cannot be read is never evicted at all: failing to measure something is
not evidence that it is stale.

### During an eval run

`--eval` sweeps the cache itself, once the report and the ledger are written, so a battery no
longer leaves its entries behind. The default TTL is 24h, and a run that reaps nothing says
nothing.

```bash
node bin/mdk-agent.js --eval --mcp-url <url> --reap-ttl 6h     # keep only the last six hours
node bin/mdk-agent.js --eval --mcp-url <url> --no-reap         # leave the cache alone
node bin/mdk-agent.js --eval --mcp-url <url> --reap-dir /mnt/c/Users/you/.qvac/kv-cache
```

`--reap-dir` names the cache root when the agent and `qvac serve` do not share a home directory,
which is what an agent under WSL against a Windows host has. Left out, the sweep uses
`~/.qvac/kv-cache`, the same default the reaper takes.

A hosted provider is never swept, because no cache of ours exists there to reclaim. A sweep that
fails prints and carries on: the run has already passed or failed on its own merits, and
housekeeping does not get to restate that verdict.

> [!CAUTION]
> The sweep runs where the agent runs, not where the model is served. Point `--reap-dir` at the
> serving machine's cache, or run the reaper there, or the eval reports a clean sweep having
> freed nothing.

## Where conversations live

A CLI holds one conversation in a variable and exits. A gateway serves many people across many
requests and has to find a conversation again between them, so history lives in a **session
store** behind an interface a Redis or SQL implementation can satisfy.

```js
const agent = await createAgent({ provider, mcp, store })   // store is optional

const session = await agent.createSession({ userId, metadata })
const resumed = await agent.resumeSession(id, { userId })   // null if gone, expired, or not theirs
```

Nothing is required to use it. Left out, the agent creates a `MemorySessionStore` — correct for
one process and no use beyond it: a restart loses every conversation, and two instances share
none. The CLI needs no configuration and works as before, with one visible change: a session id
is now a uuid rather than `sess_001`, and that is printed at startup and in `/info`.

**`resumeSession` requires the `userId` of whoever is asking, and there is no default.** A
session id travels in URLs an operator can see, so an id alone is not authority to read the
conversation behind it. A session belonging to somebody else returns `null`, exactly like one
that never existed — telling those apart would confirm the id exists, which is the thing the
check protects.

**The contract a persistent implementation satisfies.** Four rules, each of them a way the
in-memory version could otherwise be more forgiving than the real one — and so let a bug pass
locally that only appears in production:

| Method                         | Returns                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `create({ userId, metadata })` | Record: throws without a `userId`                                 |
| `get(id)`                      | Record or `null` — **`null` for expired and never-existed alike** |
| `save(record)`                 | The stored record, trimmed and re-stamped. Throws `err.code === 'SESSION_GONE'` for an id it does not hold |
| `delete(id)`                   | Whether there was anything to remove                              |
| `listByUser(userId)`           | Live records, newest first                                        |
| `sweep()`                      | How many expired records it reclaimed                             |

1. **Every method is async.** A `Map` does not need it; a network round trip does, and callers
   written against a synchronous store all break the day it is not one.
2. **Records handed out are copies.** Return the live object and `record.messages.push(...)`
   silently writes to the store here and silently writes to nothing over a network.
3. **An expired session is indistinguishable from one that never existed** — from `get` and from
   `delete` alike — and `save` against an expired id fails rather than resurrecting a conversation
   the system already discarded. That failure carries `code: 'SESSION_GONE'`, which is how a
   session tells "this conversation is over" from "this write did not land this time" and either
   detaches or retries. An implementation that omits the code gets the retry path forever.
4. **Expiry is lazy, on read.** Correctness never depends on `sweep()` having run — it only
   reclaims memory. Deliberately not a timer: a library that starts an interval nobody clears is
   a leak, and Redis returns 0 from it.

Expiry on read is enough for correctness and **not** enough for memory: a session nobody resumes
is never read, so it is never expired and never freed. The in-memory store therefore reclaims by
itself every `sweepEvery` creates (100 by default), and drops the expired records `listByUser`
walks past. `sweep()` remains for a host that would rather schedule it — and a persistent store
with native expiry can return 0 from it and do nothing.

Writes are last-one-wins. Serializing concurrent writes to one session belongs to the caller —
a gateway knows about requests and users; a store does not.

Defaults are **30 minutes idle**, reset by every write so an active conversation never dies
under the operator, and **200 messages**, a memory guard rather than the model's context window.
Trimming keeps the newest and never leaves the history opening on an assistant turn, since a
reply whose question has been dropped reads as something the model said unprompted.

## Directory layout

```text
agent/
├── index.js                    # createAgent(config) — the entry point
├── src/
│   ├── charter.js               # The standing system prompt and its version
│   ├── session-store.js         # Where conversations live; the contract Redis/SQL must satisfy
│   └── eval.js                  # The battery runner, its expectation grammar and the report
├── eval/
│   ├── battery.json             # The questions themselves
│   ├── analyse.mjs              # Reads a run back: score, verify, curve, matrix, coverage, gate
│   ├── threads.mjs              # Multi-turn conversations, for what a single question cannot reach
│   ├── conversations.json       # The operator threads that harness replays
│   └── latency.mjs              # Where a turn's time actually goes
├── bin/
│   ├── mdk-agent.js             # The CLI
│   └── qvac-cache-reaper.js     # KV-cache eviction; runs next to `qvac serve`
├── docs/
│   ├── CONTRACT.md              # The event contract every consumer (CLI, gateway, UI) builds against
│   ├── TOOLS.md                 # The tool authoring contract MCP tools must satisfy to be shown to the model
│   └── EVALUATION.md            # How a battery run is scored, recorded, and interpreted
└── qvac-runtime/                 # Local-model config for `qvac serve` (qvac.config.json)
```

## Next steps

- [Run the agent as a standalone CLI](../../../docs/guides/agent/run-standalone.md): the walkthrough this
  page's Quick start assumes
- [Deploy the agent behind the Gateway](../../../docs/guides/agent/gateway-deployment.md): mount it as a chat
  API for an operator UI instead
- [Evaluating the agent](docs/EVALUATION.md): how a battery run is scored, recorded, and interpreted
