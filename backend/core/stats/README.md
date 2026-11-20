# @tetherto/mdk-stats

Telemetry aggregation library. Provides a set of composable statistical operations that device Workers use to compute time-bucketed metrics
(hashrate averages, power totals, group counts, etc.).

Published as `@tetherto/mdk-stats`. `@tetherto/mdk-core` re-exports it as `libStats`. A Worker Plugin does not import it:
its aggregate spec names these ops and the Worker Runtime, which does import it, resolves them.

## Entry points

| Import                      | Provides                                                                  |
| --------------------------- | ------------------------------------------------------------------------- |
| `@tetherto/mdk-stats`       | `applyStats`, `tallyStats`, `mergeStats`, `getVal`, `groupBy`, `defaults` |
| `@tetherto/mdk-stats/ops`   | `getOp(name)` and `OP_NAMES`, the static op registry                      |
| `@tetherto/mdk-stats/utils` | `getVal`, `groupBy`, `parseKeypath`, `isSafeKey`, `createResMap`          |

## Usage

```js
const { applyStats, tallyStats, defaults } = require('@tetherto/mdk-stats')

// Define what to compute. `src` is a keypath into each entry; a grouping op
// takes a `group` function that returns the key.
const state = {
  ops: {
    total_power: { op: 'sum', src: 'power_w' },
    avg_hashrate: { op: 'avg', src: 'hashrate_mhs' },
    by_container: { op: 'group_sum', src: 'power_w', group: (entry) => entry.container }
  }
}

const pack = {}

// Feed entries one at a time
for (const entry of deviceSnapshots) {
  applyStats(state, pack, entry, extData)
}

// Finalize (resolve running accumulators to result values)
tallyStats(state, pack)

// pack.total_power, pack.avg_hashrate, pack.by_container now contain results
```

## API

### `applyStats(state, pack, entry, ext)`

Apply all configured operations to a single `entry`. Accumulates intermediate state in `pack`. Call once per device snapshot per time bucket.

### `tallyStats(state, pack)`

Finalize the accumulation. Resolves running counters/sums into their final values and replaces each key in `pack` with its `.res` field.

### `mergeStats(state, packs)`

Combine the partial packs of several collectors (one `applyStats` loop per Worker Runtime, each over its own
devices) into a single pre-tally pack, then call `tallyStats` on the result. Every `packs` element must be an
object — the caller drops non-responders rather than passing `null`; a collector with no entries contributes `{}`.
Each op is merged with its module's `merge`, which always builds a new accumulator, so merging and then tallying
never touches the input packs. An op whose module has no `merge` (`alerts_aggr`, `alerts_group_cnt`) throws
`ERR_STATS_OP_NOT_MERGEABLE`.

Two limitations carried over from `calc`:

- `nested_obj_concat` only keeps a nested key that the first entry of a pack carried; a nested key first seen on a
  later entry is dropped. For a merge to equal one fold over every entry, each nested key must be present from the
  first entry of every partial pack.
- The ops named in `objOps` (`array_obj_calc`) and `nestedOps` (`nested_obj_concat`) are effectively sum-only:
  the per-key accumulator is the bare value, so `avg` has no `acc`/`cnt` and `cnt` seeds with the first raw value.

### `defaults.timeframes`

Array of `[label, cronExpression]` pairs for the standard time buckets:

```js
[
  ['5m',  '0 */5 * * * *'],
  ['30m', '0 */30 * * * *'],
  ['3h',  '0 0 */3 * * *'],
  ['1D',  '0 0 0 * * *']
]
```

## Operations

| Op name | File | Description |
|---------|------|-------------|
| `cnt` | [`ops/cnt.js`](./ops/cnt.js) | Count entries |
| `sum` | [`ops/sum.js`](./ops/sum.js) | Numeric sum |
| `avg` | [`ops/avg.js`](./ops/avg.js) | Running average |
| `group` | [`ops/group.js`](./ops/group.js) | Group entries by a field |
| `group_sum` | [`ops/group_sum.js`](./ops/group_sum.js) | Sum within groups |
| `group_avg` | [`ops/group_avg.js`](./ops/group_avg.js) | Average within groups |
| `group_cnt` | [`ops/group_cnt.js`](./ops/group_cnt.js) | Count within groups |
| `group_max` | [`ops/group_max.js`](./ops/group_max.js) | Max within groups |
| `group_multiple_stats` | [`ops/group_multiple_stats.js`](./ops/group_multiple_stats.js) | Multiple aggregations per group |
| `arr_concat` | [`ops/arr_concat.js`](./ops/arr_concat.js) | Concatenate arrays across entries |
| `obj_concat` | [`ops/obj_concat.js`](./ops/obj_concat.js) | Merge objects across entries |
| `nested_obj_concat` | [`ops/nested_obj_concat.js`](./ops/nested_obj_concat.js) | Deep-merge nested objects (`nestedOps` sum-only) |
| `array_obj_calc` | [`ops/array_obj_calc.js`](./ops/array_obj_calc.js) | Compute over arrays of objects (`objOps` sum-only) |
| `alerts_aggr` | [`ops/alerts_aggr.js`](./ops/alerts_aggr.js) | Aggregate alert states |
| `alerts_group_cnt` | [`ops/alerts_group_cnt.js`](./ops/alerts_group_cnt.js) | Count alerts by group |

Every operation module exports `calc`, called once per entry. An op that folds across collectors also exports
`merge`, which combines two pre-tally accumulators; an op whose accumulator is not its result also exports
`tally`, called once to finalize.

## Errors

| Code                          | Fires when | Fix |
| ----------------------------- | ---------- | --- |
| `ERR_STATS_KEYPATH_FORBIDDEN` | A keypath segment is `__proto__`, `constructor` or `prototype` | Use a plain property path |
| `ERR_STATS_KEYPATH_INVALID`   | A keypath is empty, longer than the cap, starts with `.`, or is not `a.b[0].c` syntax | Pass plain segments and numeric indexes |
| `ERR_STATS_OP_NOT_MERGEABLE`  | `mergeStats` is asked to fold an op with no `merge` (`alerts_aggr`, `alerts_group_cnt`) | Fold those ops in a single `applyStats` pass, or leave them out of a merged spec |
| `ERR_STATS_OP_UNKNOWN`        | A spec names an op that is not in the registry | Use a registered op name |
