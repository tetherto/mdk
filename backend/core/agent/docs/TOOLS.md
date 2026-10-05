# Tool authoring contract (`v2`)

What a tool must look like to be reliable with the agent's prompt-based loop. The premise: a
small model **routes and relays** — it matches the operator's words to a tool and speaks the
result — but it must never compute, classify, or invent a value. Every rule here exists to
remove one of those failure modes, and each was derived from a failure observed on a live
4B model.

The machine-readable definition lives in [`src/tools.js`](../src/tools.js) (`validateTool`,
`validateToolResult`, `admitTools`, `renderTools`, and the `VERB`/`ENTITY`/`AXIS`/`RESULT`/
`CAPABILITY` constants). A tool server in this repo imports that module directly, so it validates
against the same definition rather than a copy. It is versioned as
`TOOL_CONTRACT_VERSION`; widening a vocabulary is additive, while adding, removing, or renaming
a **required** field is a bump. `v2` made `total` required on a `list` result.

Every tool carries the version it was authored against, in its `_meta` block as `contract`.
Admission withholds a tool declaring a version the agent does not speak, and names it in the
skip report — otherwise a server one version behind fails exactly as silently as if nothing
were versioned at all, and with the loop checking results, every one of its `list` calls would
be rejected in the field rather than skipped at startup.

**Omitting `contract` means `v1`, the version the field was introduced at — not the current
one.** A tool authored before versioning existed says nothing about what it speaks, and reading
that as "the newest contract" is precisely the case the gate exists to withhold. A tool written
for today's contract declares it.

This page is the authoring guide; the schema is the enforcement. Non-compliant tools are not
errors — they are **skipped with a reason** and the model never sees them.

## The pipeline

```
MCP server → validateTool (authored correctly?) → admitTools (may THIS model see it?)
           → renderTools (the prompt block the model reads)
```

## Naming — the name is the routing signal

Every tool is `<verb>_<entity>`, both from closed sets. The verb also fixes the result shape,
so the model learns one expectation per verb rather than one per tool.

| Verb | Operator intent | Must return (beyond `summary`) |
|---|---|---|
| `count` | "how many…" | `count` |
| `list` | "which… / show me…" | `count`, `total`, `items` |
| `get` | "what is X of one thing" | `ref`, `attr`, `value` |
| `rank` | "most / least by metric" | `metric`, `order`, `items`, `unavailable` |
| `summarize` | "how is it doing" | `totals` |
| `diagnose` | "why…" | `findings` |
| `act` | "reboot / set…" | `ref`, `action`, `outcome` — **always approval-gated** |

Entities: `site · device · worker · pool`. Collection verbs read in the plural
(`count_devices`), single-item verbs in the singular (`get_device`). Device families
(miner, container…) are **parameters, not new tools** — the tool count stays bounded by
verbs × entities, not by the question space.

## Parameters — un-inventable, by construction

A parameter must be one of exactly three kinds; free text is where a small model
hallucinates a value (observed: `"not ready"` invented for `"notready"`).

| Kind | Declaration | Example |
|---|---|---|
| Closed enum | `enum: [...]`, reuse the shared `AXIS` vocabularies | `family`, `state`, `metric` |
| Bounded integer | `type: 'integer'` with `minimum` and `maximum` | `limit` 1..50 |
| Id reference | `type: 'string'` with `x-mdk-ref: '<entity>'` — the model copies an id from context, never invents one | `ref` |

Every optional parameter declares a `default`. Shared axes (`AXIS.family`, `AXIS.state`,
`AXIS.metric`, `AXIS.order`) are reused across tools so the model learns the vocabulary once.
A tool server in another language, or one that cannot import the contract, restates these —
in which case pin the two copies with a test, or they drift and tools are silently skipped.

## The agent metadata block

The routing contract travels in the MCP descriptor's `_meta['x-mdk-agent']` — **not** in
`annotations`, whose closed client-side schema silently strips unknown keys (pinned by a
regression test). In a [`backend/core/mcp`](../../mcp/README.md) plugin manifest it is authored as the tool's
`agent` field and carried through verbatim:

```json
{
  "id": "count_devices",
  "handler": "./tools/count.js",
  "description": "How many devices, by family and state.",
  "annotations": { "readOnlyHint": true },
  "agent": {
    "enabled": true,
    "answers": "How many devices, by family and state.",
    "useWhen": ["how many miners", "number of offline devices", "how many are down"],
    "notFor": ["listing them (use list_devices)"],
    "returns": "a count with a one-line summary",
    "minCapability": "small"
  }
}
```

| Field | Rule | Why |
|---|---|---|
| `enabled` | Literal `true` to opt in | Tools without it are never shown to the model |
| `answers` | One line: the question this tool owns | The routing headline |
| `useWhen` | 2–6 real operator phrasings | The routing index — the model matches words, its actual strength |
| `notFor` | Optional pointers to sibling tools | Disambiguation between neighbours |
| `outOfScope` | Optional: things **no** tool here answers | Merged into the shared coverage block — see below |
| `returns` | What the result contains | Sets the model's expectation |
| `minCapability` | Required: `small`, `mid` or `large` — never defaulted | An undeclared floor would fall through to the weakest model, exactly where misrouting happens |

Mutability is declared in standard MCP `annotations.readOnlyHint` (it survives the wire), and
an `act_*` tool must declare `readOnlyHint: false` — the approval gate keys off the
declaration, not a name list. (If `readOnlyHint` is unstated, `destructiveHint: true` is also
recognized as declaring a write).

> [!NOTE]
> For tools generated from a Gateway plugin's HTTP routes, that declaration comes from the route's own `safety` field in
> [`from-http-plugin.js`](../../mcp/lib/from-http-plugin.js): `'read-only'` maps to `readOnlyHint: true`, `'write'` maps to
> `readOnlyHint: false` plus `destructiveHint: true`, and a route that states neither fails safe to `readOnlyHint: false` —
> treated as a write, gated behind approval, rather than guessed from the route or tool name.

## Coverage — the boundary, not just the index

`useWhen` is a positive index: it tells the model where to route. On its own it gives the model
nothing to route *away* from, so **declining becomes the one behaviour the prompt cannot
express** — and each tool absorbs the questions that sound like its topic but that it cannot
answer. Measured on 259 questions, this was the single largest failure class: every tool scored
86–100%, while questions that no tool covers scored **60%**. The misroutes were not concentrated
on one "magnet" tool; they were spread across all of them, each catching its own topic:

| Question | Went to | Why |
|---|---|---|
| "Is antminer-0 under warranty?" | `get_device` | it names a device |
| "Email the maintenance team" | `act_device` | it is an action |
| "Which miner will fail next?" | `rank_devices` | it ranks miners |
| "How much did we hash last week?" | `summarize_site` | it is about the site |

So the tool block carries a second half. `renderCoverage` states what the tool set does not
answer, plus anything the admitted tools add via `outOfScope`, deduplicated.

**`NOT_COVERED` is a default, not a law.** It describes a tool set that reports present fleet
state — the six demo tools. It is *not* a property of the taxonomy: `AXIS` carried a time
`window` in the first draft of this contract and it was dropped only for being unused, so a
`rank_devices` over a period is expressible today. Replace the boundary when your tools cover
more:

```js
// tools that answer about cost and history — the default would tell the model to refuse them
const agent = await createAgent({ provider, mcp: { url }, notCovered: ['anything outside this site'] })

// or drop the block entirely, e.g. for a model that does not need it
const agent = await createAgent({ provider, mcp: { url }, notCovered: [] })
```

**A line that contradicts an admitted tool is worse than no line at all** — the model is told
to decline a question its own tools answer. Keep the boundary true of the tools you ship.

As with `capability`, there is no CLI flag for it, so [`bin/mdk-agent.js`](../bin/mdk-agent.js) always uses the
default; a different boundary is reachable only through the library.

Use `notFor` to point at a **sibling tool**; use `outOfScope` when **no tool here answers it at
all**. The two are rendered differently and mean different things.

## Results — one shape per verb

The tool computes; the model relays. Every result carries a ready-to-speak `summary`, so the
model's job collapses from "derive the answer from this JSON" to "deliver this sentence" — the
single biggest accuracy lever we measured.

The rest of the payload is fixed **by the verb, not by the entity**. `list_workers` and
`list_devices` return the same fields, so the model learns one expectation per verb rather than
one per tool, and a non-model consumer (the gateway, a test) can read the answer without
parsing prose. The machine-readable version is `RESULT` in [`src/tools.js`](../src/tools.js); `validateToolResult`
enforces it.

| Verb | Required fields | Meaning |
|---|---|---|
| `count` | `summary`, `count` | `count` is a non-negative integer — the whole answer |
| `list` | `summary`, `count`, `total`, `items` | `count` **must equal** `items.length`, and never exceed `total` |
| `get` | `summary`, `ref`, `attr`, `value` | the entity asked for, which attribute, and its value |
| `rank` | `summary`, `metric`, `order`, `items`, `unavailable` | each item carries its `metric` value; `unavailable` counts what did not report |
| `summarize` | `summary`, `totals` | `totals` is an object of rollups |
| `diagnose` | `summary`, `findings` | `findings` is an array, empty when nothing is wrong |
| `act` | `summary`, `ref`, `action`, `outcome` | what was done, to what, and how it ended |

Two rules deserve their reasons stated, because both were real failures:

**`get` answers under `value`, always.** The obvious design keys the result by the attribute
asked for — `capabilities`, `telemetry`, `state`. That makes the model guess which field holds
the answer, which is the routing problem again one level down. One key, every attribute.

**`count` must equal `items.length` in a `list`, and `total` says how many matched.** A list
that can be cut short has two numbers, and they are not interchangeable: `count` is what was
named, `total` is what is out there. When `count` and `items` disagree the payload is
well-formed and gives the model two different answers to one question — and it speaks the wrong
one. The tool loop validates every result from a tool that declares this contract, so a
malformed one is reported as a failed call rather than reaching an operator as fact. Tools that
declare no agent metadata are left alone, so a server predating this taxonomy still works.

Fields beyond the required set are allowed (`act_device` returns the raw `result` too). Adding
an optional one is additive; adding, removing or renaming a **required** one is a contract break
and bumps `TOOL_CONTRACT_VERSION`.

**The summary must be true when read alone — including when the tool found nothing.** A result
can satisfy every rule above and still be useless: `get_device` on a container returned
`value: {}` with the summary *"Live readings for container-1"*, and the model relayed `{}` to
the operator. The schema cannot catch this, because the shape was correct. Write the summary as
the sentence you would want spoken, then check it is still true when the data is empty.

This is the dividing line worth internalising: **the schema enforces shape, the battery
enforces meaning.** Do not try to push semantic rules into `validateToolResult` — write the
question that would expose the lie instead.

```json
{ "summary": "2 of 15 miners are offline: antminer-0, avalon-3.",
  "count": 2, "total": 2,
  "items": [{ "deviceId": "antminer-0" }, { "deviceId": "avalon-3" }] }
```

## Capability floors

`minCapability` states the weakest model allowed to see the tool. `admitTools` withholds a
tool whose floor exceeds the running model, so a 4B never sees `diagnose_site` and cannot
misroute to it. One tool library, tiered by declaration — no per-model rewrites.

**Some floors belong to the verb, not the author.** `VERB_FLOOR` fixes `diagnose` at `mid` or
above, and `validateTool` rejects a `diagnose_*` tool that declares `small` — declaring a lower
floor is not an escape hatch.

The reason is measured. Every other verb is routing and relaying: the tool computes, the model
repeats. `diagnose` asks the model to reason from evidence to a cause, which no result shape can
hand it ready-made. On a 4B, questions of that shape scored **0/4** — and every failure was a
confident wrong answer rather than a refusal, which is the worst outcome this contract has.

So `diagnose_*` tools are written once and tiered, not written twice. Until a mid-tier model is
served, they are registered and skipped, and the skip report names them.

The other half is the consumer declaring what it is running. `createAgent` takes a
`capability` of `small` (the default), `mid` or `large`:

```js
const agent = await createAgent({ provider, mcp: { url }, capability: 'mid' })
```

There is no CLI flag for it yet, so [`bin/mdk-agent.js`](../bin/mdk-agent.js) always runs at `small` — a tool
declaring a higher floor is registered and skipped, and the skip report names it. Until a flag
exists, `mid` and `large` tools are reachable only through the library.

## Adding a tool

Six steps. The gate at the end is a battery run, not a review — a tool ships with evidence that
a model routes to it, or it does not ship.

**1. Pick the coordinate.** A `verb` × `entity` from the closed sets. If none fits, that is a
change to the contract — propose it — not a tool with a new name shape.

**2. Write the handler so it computes the answer.** Never return a raw dump for the model to
filter, count, or classify. If the operator asked "how many", the tool returns the number.

**3. Return the shape your verb promises** (the table above), with a `summary` the model can
speak word for word.

**4. Declare the metadata**: `answers`, 2–6 real `useWhen` phrasings, `notFor` pointing at
neighbouring tools, `returns`, `minCapability`, and `annotations.readOnlyHint`.

**5. Add battery cases** in [`eval/battery.json`](../eval/battery.json) — at least two phrasings
per tool, plus one that must *not* route to it. Express the expected answer against the probed
fleet, never as a hardcoded number:

```json
{ "id": "count-pools", "q": "How many pools are configured?", "tool": "count_devices",
  "expect": { "number": "pools" }, "tags": ["count", "plain"] }
```

`expect` is data, not code — the battery is JSON so it can be read and diffed by people who do
not run it. The grammar is listed in [`src/eval.js`](../src/eval.js): `number`, `pattern`,
`any`, `anyId` / `allIds` against a probed id list, `declined`, and `anyOf` to accept either of
two defensible answers. `"tool": null` requires a refusal.

Every case is validated before the first question is asked, so a malformed one is a startup
error rather than a surprise forty minutes into a run.

A run reports any admitted tool no case covers, so skipping this step is visible rather than
silent.

**6. Run the battery and attach the report.** That JSON is the proof:

```sh
node bin/mdk-agent.js --mcp-url http://127.0.0.1:3008/mcp --eval --reps 3 --out eval-report.json
```

Three reps, not one: routing that passes once and fails twice is the failure a single run hides,
and the report names those cases as unstable. The run exits non-zero if anything fails.

Useful while iterating: `--only count-pools` restricts the run to matching case ids.

## What a battery run scores

Each case is scored on four independent checks, because they fail independently:

| Check | Question | Typical cause when it fails |
|---|---|---|
| `route` | did the model pick this tool for these words? | `useWhen` misses the operator's phrasing, or a neighbour overlaps |
| `answer` | did it relay the right value? | the tool made the model compute, or `summary` buried the number |
| `contract` | did the result match the verb's shape? | the handler; caught on every tool call in the run |
| `approval` | was a write gated before running? | `readOnlyHint` not declared `false` (or `destructiveHint: true`) |

Approvals are always rejected during a run — an eval never leaves a write behind on the fleet
it measures. The `approval` check is an **invariant, not an expectation**: any run that called
an `act_*` tool must have raised a `pending_approval`, whether or not the case asked for it.
Left opt-in, a regression that stopped gating writes would pass every case that had not
declared the check.

**What `answer` does and does not cover.** Roughly a third of cases assert only that the model
said something (`{"pattern": "\\w"}`) — questions whose correct answer depends on live state
that varies between runs, like *"is antminer-0 online?"*. Those cases genuinely test routing,
the result contract and the gate, but their answer check is close to free. Read the `answer`
number as covering the two-thirds of cases that assert real content, and prefer `number`,
`anyId` or `any` over a bare pattern when adding a case.

## What has already been tried

Measured on 259 questions × 2 reps against a 4B. Recorded so they are not retried blind:

| Change | Result |
|---|---|
| Coverage boundary (`renderCoverage`) | **Kept.** Questions no tool covers: 60% → 86% |
| Charter rule for non-questions | **Kept.** `"asdfgh qwerty"` and `"?"` went 0/4 → 4/4 |
| `get_device` checks the ref exists | **Kept.** Correctness: a missing device no longer reads as a silent one |
| `notFor` on `act_device` for "is this action possible" | **Dropped.** Target case unchanged, `act_device` misroutes rose 6 → 8 |
| Remove device ids from the `summarize_site` rollup | **Dropped.** The largest single cause in the data, and still worse: `list_devices` 89% → 87%, polarity 100% → 78% |

The last one is the useful lesson. It was the best-reasoned change of the five — `summarize`
naming identities really is `list`'s job — and it made things worse anyway. **A change that is
right in principle still has to earn its place in the numbers.** Run the battery before and
after, and revert what does not pay.

Note also what the first three have in common and the last two do not: the kept changes state a
rule that is true of the whole tool set, while the dropped ones adjusted one tool's wording to
win one question class. Fixes that generalise tend to survive measurement; fixes aimed at a
symptom tend not to.

## Compliance checklist

- Name is `verb_entity` from the closed sets
- Every parameter is an enum, bounded integer, or `x-mdk-ref` id — with defaults on optionals
- `annotations.readOnlyHint` declared; `false` on every `act_*`
- `agent` block complete: `enabled`, `answers`, 2–6 `useWhen`, `returns`, `minCapability`
- Result carries a `summary` plus every field its verb requires
- `validateTool(tool).ok === true`
- At least two battery cases, and a passing report attached to the PR
