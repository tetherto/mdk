# Measured envelope

`envelope.json` is the only number source this skill may quote. It is compiled
from capacity profiles (harness reports or the fixture set under `eval/profiles/`).

## Profile shape

Each profile is either a full harness report (`backend/tests/benchmark/published/<run>/<id>.json`
for the committed runs, `backend/tests/benchmark/results/<id>.json` for a local one) or the slim
fields `compile-envelope.mjs` keeps:

- `profileId`, `tier`, `hardware`
- `deviceCount`, `workerCount`, `workers[]` (`type`, `model`, `deviceCount`)
- `status` (`green` / `amber` / `red`)
- `headroomRatio`, `rssSumMiB`, `cpuSumPct`, `readP99Ms`, `actionP99Ms`
- `source` (`measured` or `fixture`)

Pass/fail uses the same bars as the harness (`headroomGreenBelow` 0.7,
`headroomAmberBelow` 1.0, action submit p99 2000 ms, steady CPU 80% of one
core). **Supported up to** is the densest green profile on that family mix and
tier, matching the [capacity metrics template](../../../../../../docs/guides/deployment/capacity-metrics-template.md).

## Compile

```bash
# fixtures (default) — what the held-out bar runs against until PE-1
node scripts/compile-envelope.mjs

# the committed harness runs, present in a fresh clone
node scripts/compile-envelope.mjs --from <repo>/backend/tests/benchmark/published/2026-10-27-m3max

# a local results/ directory from npm run benchmark, gitignored
node scripts/compile-envelope.mjs --from <repo>/backend/tests/benchmark/results
```

`--from` must contain one `.json` per profile. Replacing fixtures with
committed harness reports (the 1.0 PE-1 gate) is how this envelope becomes
measured. After that, re-run `eval-held-out.mjs` and keep any case whose
expected window still matches; drop or rewrite cases the new data invalidates.

## Lookup

`size-site.mjs` does not invent a topology. It picks the smallest covering
profile (`deviceCount >= requested`) at the best status, interpolates RSS/CPU
between the next-smaller green point and that cover, and refuses to label
anything past the last non-red point as supported.
