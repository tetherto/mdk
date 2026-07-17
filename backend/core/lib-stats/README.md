# lib-stats

Telemetry aggregation library. Provides a set of composable statistical operations that device Workers use to compute time-bucketed metrics (hashrate averages, power totals, group counts, etc.).

This is an internal package used by `ThingManager` in `backend/workers/base/`. It is not published separately.

## Usage

```js
const { applyStats, tallyStats, defaults } = require('./lib-stats')

// Define what to compute
const state = {
  ops: {
    total_power: { op: 'sum', field: 'power_w' },
    avg_hashrate: { op: 'avg', field: 'hashrate_mhs' },
    by_container: { op: 'group_by', field: 'container' }
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
| `cnt` | `ops/cnt.js` | Count entries |
| `sum` | `ops/sum.js` | Numeric sum |
| `avg` | `ops/avg.js` | Running average |
| `group` | `ops/group.js` | Group entries by a field |
| `group_sum` | `ops/group_sum.js` | Sum within groups |
| `group_avg` | `ops/group_avg.js` | Average within groups |
| `group_cnt` | `ops/group_cnt.js` | Count within groups |
| `group_max` | `ops/group_max.js` | Max within groups |
| `group_multiple_stats` | `ops/group_multiple_stats.js` | Multiple aggregations per group |
| `arr_concat` | `ops/arr_concat.js` | Concatenate arrays across entries |
| `obj_concat` | `ops/obj_concat.js` | Merge objects across entries |
| `nested_obj_concat` | `ops/nested_obj_concat.js` | Deep-merge nested objects |
| `array_obj_calc` | `ops/array_obj_calc.js` | Compute over arrays of objects |
| `alerts_aggr` | `ops/alerts_aggr.js` | Aggregate alert states |
| `alerts_group_cnt` | `ops/alerts_group_cnt.js` | Count alerts by group |

Each operation module exports `{ calc, tally }`. `calc` is called per entry; `tally` is called once to finalize.
