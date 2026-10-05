---
title: Evaluating the agent
description: How a battery run is scored, recorded, and interpreted
---

## Overview

This page describes the measurement layer for `@tetherto/mdk-agent`: what a run scores, the three
questions one run can answer, and the record it leaves behind. The premise is the one the
[tool authoring contract](TOOLS.md) rests on, that the model routes and relays, so a run scores
*how* an answer was reached and not merely whether one appeared.

Questions live in `eval/battery.json` as readable data. Expectations resolve against the
fleet under test at run time, so the same file travels to any MDK site instead of encoding one
demo's inventory.

## What a run scores

Each case is scored on five checks. They fail independently, and a case passes only when all five
hold:

| Check      | Question it asks                                          |
|------------|-----------------------------------------------------------|
| `route`    | Did the model pick a permitted tool for the words used?   |
| `answer`   | Did the reply carry the value the fleet actually reports? |
| `target`   | Did an action name a device that exists?                  |
| `approval` | Was a write gated before it ran?                          |
| `contract` | Did the tool return the shape its verb promises?          |

Two of these describe the harness rather than the model. `approval` is decided by
`requiresApproval` in [`src/constants.js`](../src/constants.js), and `contract` by
`validateToolResult` in [`src/tools.js`](../src/tools.js). Both are deterministic code.

> [!IMPORTANT]
> When comparing two models, `approval` and `contract` hold identical across runs. A difference
> there is a fault in the rig, such as a different tool server or a partial install, and never a
> finding about either model.

A case may permit more than one right answer. Writing `"tool": ["diagnose_site", null]` accepts
either a route to that tool or an honest refusal, which is what makes one file runnable across
capabilities: a model that cannot see the tool passes by declining, and a model that can passes by
routing.

## Four readings of one run

Collecting a run needs a live model and a live fleet. Reading one needs neither, because every
analysis is a pure function over stored results. Separating the two is what lets a comparison stay
readable long after the models that produced it are unloaded.

| Reading  | What varies                          | Verdict                                     |
|----------|--------------------------------------|---------------------------------------------|
| Gate     | Your code, with the model held fixed | Per case, against a stored baseline         |
| Curve    | Nothing; it reads one run            | That run's pass rate by difficulty level    |
| Matrix   | The model                            | Pass rate by difficulty level, side by side |
| Coverage | The tool surface                     | Which named tools ever answered             |

The gate is per case rather than a percentage, because ten cases breaking while ten others start
passing leaves the total untouched.

> [!CAUTION]
> A model is not deterministic, so the same case can disagree with itself across repetitions of a
> single run. A gate demanding exact equality raises an alarm on every run. Gate on a per case pass
> rate with a tolerance, and treat the unstable set a run reports as the noise floor.

## Comprehension and honesty are separate axes

Every case carries tags describing how the question is phrased. `eval/difficulty.json` ranks those
tags into two axes, and a case is placed once, by its hardest feature:

- Comprehension, `L1` through `L4`, from a question asked plainly to one that fights the reader
  with negation, compound clauses, or a false premise
- Honesty, `H1` and `H2`, where the correct answer is a refusal because no tool covers the question

Honesty is deliberately not the top rung of the comprehension ladder. A larger model is more
capable of constructing a plausible answer to a question it has no data for, so the two axes can
move in opposite directions. Ranking refusals as merely harder would assert the conclusion the
measurement exists to test.

The ranking is derived metadata. Cases are never edited to add a level, so the ladder can be
revised without invalidating a historical run.

## Provenance, and what it does not prove

Every run records the conditions it happened under: the hash of the question file, the agent
commit, the charter and contract versions, the model, the declared capability, and the budget it
bought, the repetitions, and the admitted tool set with each tool's declared floor. The endpoint is
stored as a hash rather than a URL, so an internal hostname cannot travel with a report.

Runs append to a ledger where each entry carries the hash of the entry before it. The chain is a
tamper-evidence guardrail: it does not prevent an edit, it makes one visible. Altering a single run
forces every later entry to be recomputed, so a change that would have touched one line appears as
a rewrite of the whole file.

> [!WARNING]
> None of this proves a result is true. A hash proves only that a file was not edited after it was
> written, and numbers invented and then hashed verify perfectly. Call it an audit trail, never
> proof.

What is genuinely verifiable is narrower and more useful. Scoring is a pure function over stored
transcripts, so anyone can re-derive the verdict with no model, no GPU, and no fleet. The run is
not reproducible; the verdict is.

## Running the battery

A run needs a served model and a tool server. It is deliberately not part of CI, which has neither.

While iterating, restrict the run to the case or tag you're working on, and keep `--reps` low:

```bash
node bin/mdk-agent.js \
  --model qwen3-4b --capability small \
  --base-url http://127.0.0.1:11500/v1 \
  --mcp-url http://127.0.0.1:3008/mcp \
  --eval --only decline- --reps 1
```

`--tag rank` restricts by tag the same way. Once the cases you're changing pass, the full battery,
every case at `--reps 3`, is the maintainer run before a release, not the next step after
[running the CLI](../../../../docs/guides/agent/run-standalone.md):

```bash
node bin/mdk-agent.js \
  --model qwen3-4b --capability small \
  --base-url http://127.0.0.1:11500/v1 \
  --mcp-url http://127.0.0.1:3008/mcp \
  --eval --reps 3 --concurrency 4
```

The run prints a line per case, a summary, and the ledger entry it wrote. Reading it back needs
nothing running:

```bash
node eval/analyse.mjs
node eval/analyse.mjs --verify
node eval/analyse.mjs --curve --run <runId>
node eval/analyse.mjs --matrix --runs <runId>,<runId>
node eval/analyse.mjs --coverage --run <runId>
node eval/analyse.mjs --gate --baseline <runId> --run <runId>
```

A run Id is long, so any unambiguous part of one will do. A token matching more than one run is
rejected.

> [!TIP]
> Comparing models means holding everything else still. Run both at the same `--capability` against
> the same fleet, so the model is the only variable. Latency is not comparable across different
> hardware even when accuracy is.

Results stay local. The ledger, the run files, and the baseline are ignored by git, because they
belong to a deployment rather than to the library.

## Adding questions

A new tool ships with its proof: the tool, its tests, and its battery questions. A run reports any
admitted tool no case exercises, so a growing tool surface cannot quietly outrun its coverage.

The frozen set is what makes a gate meaningful, so its hash must not move. New questions belong in
their own file, passed with `--battery <path>`, and a gate refuses to compare two runs whose
question files differ rather than averaging across two different exams.

Questions the current tool surface genuinely cannot answer are reported as skipped and named,
rather than scored as failures. The coverage boundary is stated, not hidden.

## Limits

- A stochastic system cannot carry a zero tolerance gate. The defensible promise is that no case
  degrades from reliable to unreliable and that the unstable set does not grow.
- A tag with few cases produces a rate reading like a measurement when it is not. Report the count
  alongside the percentage.
- The battery only asks questions a tool already answers. Multi turn behavior, where a model has
  prior context to work from, is measured by [`eval/threads.mjs`](../eval/threads.mjs) instead.
- Cases a fleet cannot express are skipped, so two runs are comparable only against the same fleet

## Next steps

- [Tool authoring contract](TOOLS.md): what a tool declares to be admitted, and the capability
  floors deciding which model sees it
- [Agent event contract](CONTRACT.md): the typed stream a turn produces, which a run reads to score
  each case
