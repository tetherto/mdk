'use strict'

const test = require('brittle')
const { validateOps, aggregate, toEntry, createAggregateCache } = require('../../lib/telemetry')

const TELEMETRY = [
  { name: 'hashrate_rt', type: 'number' },
  { name: 'status', type: 'string' },
  { name: 'online', type: 'boolean' },
  { name: 'temps', type: 'array' },
  { name: 'pools', type: 'object' }
]

// Stored points as the collector writes them: a failed metric is `{ error }`.
const ENTRIES = [
  toEntry('a', { hashrate_rt: 100, status: 'mining', online: true, temps: [60, 61], pools: { p1: 1 } }, { container: 'c1' }),
  toEntry('b', { hashrate_rt: 50, status: 'mining', online: true, temps: [70], pools: { p1: 2 } }, { container: 'c1' }),
  toEntry('c', { hashrate_rt: { error: 'ERR_TELEMETRY_FAILED' }, status: 'sleeping', online: false, temps: [], pools: {} }, { container: 'c2' }),
  toEntry('d', { hashrate_rt: 20, status: 'mining', online: true }, {})
]

function rejects (t, ops, code, why) {
  const { error, state } = validateOps(ops, TELEMETRY)
  t.ok(error && error.startsWith(code) && !state, why || `${code}: ${JSON.stringify(ops)} -> ${error}`)
}

function accepts (ops) {
  const { state, error } = validateOps(ops, TELEMETRY)
  if (error) throw new Error(error)
  return state
}

test('aggregate - op specs are validated against the declared metric types', (t) => {
  rejects(t, {}, 'ERR_AGGREGATE_SPEC_INVALID')
  rejects(t, [], 'ERR_AGGREGATE_SPEC_INVALID')
  rejects(t, JSON.parse('{"__proto__": { "op": "cnt" }, "x": { "op": "cnt" } }'), 'ERR_AGGREGATE_SPEC_INVALID')
  rejects(t, { x: { op: 'median', src: 'metrics.hashrate_rt' } }, 'ERR_AGGREGATE_OP_UNKNOWN')
  rejects(t, { x: { op: 'alerts_aggr', src: 'metrics.hashrate_rt' } }, 'ERR_AGGREGATE_OP_UNKNOWN')
  rejects(t, { x: { op: 'sum', src: 'metrics.watts' } }, 'ERR_AGGREGATE_SRC_UNKNOWN')
  rejects(t, { x: { op: 'sum', src: 'device.container' } }, 'ERR_AGGREGATE_SRC_UNKNOWN', 'the config block is never a source')
  rejects(t, { x: { op: 'group_cnt', group: 'device.password' } }, 'ERR_AGGREGATE_GROUP_INVALID')
  rejects(t, { x: { op: 'sum' } }, 'ERR_AGGREGATE_SRC_UNKNOWN')
  rejects(t, { x: { op: 'avg', src: 'metrics.status' } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'sum', src: 'metrics.online' } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'sum', src: 'info.container' } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'arr_concat', src: 'metrics.hashrate_rt' } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'obj_concat', src: 'metrics.temps' } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'group_sum', src: 'metrics.hashrate_rt' } }, 'ERR_AGGREGATE_GROUP_INVALID')
  rejects(t, { x: { op: 'group_sum', src: 'metrics.hashrate_rt', group: 'device.container' } }, 'ERR_AGGREGATE_GROUP_INVALID')
  rejects(t, { x: { op: 'cnt', filter: { src: 'metrics.nope', eq: 1 } } }, 'ERR_AGGREGATE_FILTER_INVALID')
  rejects(t, { x: { op: 'cnt', filter: 'mining' } }, 'ERR_AGGREGATE_FILTER_INVALID')
  rejects(t, { x: { op: 'group_multiple_stats', group: 'info.container', srcs: [{ name: 'h', src: 'metrics.nope' }] } }, 'ERR_AGGREGATE_SRC_UNKNOWN')
  rejects(t, { x: { op: 'array_obj_calc', src: 'metrics.temps', objOps: [{ src: 'temp', op: 'avg' }] } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'nested_obj_concat', src: 'metrics.pools', nestedOps: [{ src: 'n', op: 'cnt' }] } }, 'ERR_AGGREGATE_OP_TYPE')
  rejects(t, { x: { op: 'nested_obj_concat', src: 'metrics.pools', nestedOps: [{ src: '__proto__', op: 'sum' }] } }, 'ERR_AGGREGATE_SPEC_INVALID')
  rejects(t, { x: { op: 'nested_obj_concat', src: 'metrics.pools', nestedOps: [{ src: 'constructor.prototype', op: 'sum' }] } }, 'ERR_AGGREGATE_SPEC_INVALID')
  rejects(t, { x: { op: 'cnt', filter: { src: 'info.foo bar', eq: 1 } } }, 'ERR_AGGREGATE_FILTER_INVALID')
  rejects(t, { x: { op: 'cnt', filter: { src: 'info.constructor.prototype', eq: 1 } } }, 'ERR_AGGREGATE_FILTER_INVALID')
  rejects(t, { x: { op: 'cnt', filter: { src: 'metrics.status', eq: { a: 1 } } } }, 'ERR_AGGREGATE_FILTER_INVALID')
  rejects(t, { x: { op: 'cnt', filter: { src: 'metrics.status' } } }, 'ERR_AGGREGATE_FILTER_INVALID')
  rejects(t, { x: { op: 'group_cnt', group: 'metrics' } }, 'ERR_AGGREGATE_GROUP_INVALID')

  t.execution(() => accepts({
    total: { op: 'sum', src: 'metrics.hashrate_rt' },
    mining: { op: 'cnt', filter: { src: 'metrics.status', eq: 'mining' } },
    by_container: { op: 'group_sum', src: 'metrics.hashrate_rt', group: 'info.container' },
    by_device: { op: 'group', src: 'metrics.status', group: 'deviceId' },
    temps: { op: 'arr_concat', src: 'metrics.temps' },
    pools: { op: 'obj_concat', src: 'metrics.pools' },
    multi: { op: 'group_multiple_stats', group: 'info.container', srcs: [{ name: 'h', src: 'metrics.hashrate_rt' }] },
    boards: { op: 'array_obj_calc', src: 'metrics.temps', objOps: [{ src: 'temp', op: 'sum' }] },
    nested: { op: 'nested_obj_concat', src: 'metrics.pools', nestedOps: [{ src: 'shares', op: 'sum' }] },
    nullable: { op: 'cnt', filter: { src: 'info.rack', eq: null } }
  }))
})

test('aggregate - computes ops over the latest entries; errored or missing metrics are left out of that op', (t) => {
  const ops = {
    total: { op: 'sum', src: 'metrics.hashrate_rt' },
    avg: { op: 'avg', src: 'metrics.hashrate_rt' },
    devices: { op: 'cnt' },
    mining: { op: 'cnt', filter: { src: 'metrics.status', eq: 'mining' } },
    online: { op: 'cnt', filter: { src: 'metrics.online', eq: true } },
    by_container: { op: 'group_sum', src: 'metrics.hashrate_rt', group: 'info.container' },
    status_by_device: { op: 'group', src: 'metrics.status', group: 'deviceId' },
    temps: { op: 'arr_concat', src: 'metrics.temps' },
    pools: { op: 'obj_concat', src: 'metrics.pools' }
  }
  const { ops: result, partial } = aggregate(accepts(ops), ENTRIES)

  t.is(result.total, 170)
  t.is(result.avg, 170 / 3, 'the errored device is not averaged in as 0')
  t.is(result.devices, 4)
  t.is(result.mining, 3)
  t.is(result.online, 3)
  t.alike({ ...result.by_container }, { c1: 150 })
  t.alike({ ...result.status_by_device }, { a: 'mining', b: 'mining', c: 'sleeping', d: 'mining' })
  t.alike(result.temps, [60, 61, 70])
  t.alike({ ...result.pools }, { p1: 3 })

  t.alike(partial.avg, { acc: 170, cnt: 3, res: 0 }, 'partials are pre-tally accumulators for the Kernel to merge')
  t.alike(partial.total, { res: 170 })
  t.alike(JSON.parse(JSON.stringify(partial.by_container)), { res: { c1: 150 } })
  t.is(JSON.parse(JSON.stringify(partial)).avg.cnt, 3, 'partials survive the wire')
  t.alike(ENTRIES[2].metrics, { status: 'sleeping', online: false, temps: [], pools: {} }, 'toEntry drops errored metrics')
})

test('aggregate - a value that is null or not of the declared type is left out of that op; falsy group keys still group', (t) => {
  const entries = [
    toEntry('a', { hashrate_rt: null, online: false, status: 'mining' }, { port: 0 }),
    toEntry('b', { hashrate_rt: 'abc', online: true, status: 'mining' }, { port: 0 }),
    toEntry('c', { hashrate_rt: 0, online: false, status: 'sleeping' }, { port: 1 }),
    toEntry('d', { hashrate_rt: 30, online: true, status: 'mining' }, {})
  ]
  const { ops } = aggregate(accepts({
    total: { op: 'sum', src: 'metrics.hashrate_rt' },
    avg: { op: 'avg', src: 'metrics.hashrate_rt' },
    online: { op: 'group_cnt', group: 'metrics.online' },
    by_port: { op: 'group_cnt', group: 'info.port' },
    by_hr: { op: 'group', src: 'metrics.status', group: 'metrics.hashrate_rt' },
    multi: { op: 'group_multiple_stats', group: 'metrics.status', srcs: [{ name: 'hr', src: 'metrics.hashrate_rt' }, { name: 'id', src: 'deviceId' }] }
  }), entries)
  t.is(ops.total, 30)
  t.is(ops.avg, 15, 'mean of the two finite numbers only')
  t.alike({ ...ops.online }, { true: 2, false: 2 })
  t.alike({ ...ops.by_port }, { 0: 2, 1: 1 }, 'a device without the key is dropped')
  t.alike({ ...ops.by_hr }, { 0: 'sleeping', 30: 'mining', abc: 'mining' }, 'group keys are not typed, only sources are')
  t.alike(JSON.parse(JSON.stringify(ops.multi)), { mining: { hr: 30, id: 'd' }, sleeping: { hr: 0, id: 'c' } }, 'last device per group wins')
})

test('aggregate - cache serves an identical spec within the TTL and recomputes after', (t) => {
  let now = 1000
  const cache = createAggregateCache(50, () => now)
  const key = { ops: { total: { op: 'sum', src: 'metrics.hashrate_rt' } }, deviceIds: ['a', 'b'] }
  t.is(cache.get(key), undefined)
  cache.set(key, { ops: { total: 1 } })
  t.alike(cache.get(key), { ops: { total: 1 } })
  t.alike(cache.get({ ...key, deviceIds: ['a'] }), undefined, 'a different device set computes its own')
  now = 1049
  t.alike(cache.get(key), { ops: { total: 1 } })
  now = 1050
  t.is(cache.get(key), undefined, 'expired')

  cache.set(key, { ops: { total: 1 } })
  const gen = cache.gen
  cache.clear()
  t.is(cache.get(key), undefined, 'clear() drops every answer')
  cache.set(key, { ops: { total: 2 } }, gen)
  t.is(cache.get(key), undefined, 'an answer computed before clear() is refused')
  cache.set(key, { ops: { total: 3 } }, cache.gen)
  t.alike(cache.get(key), { ops: { total: 3 } })

  for (let i = 0; i < 300; i++) cache.set({ ops: { n: i } }, i)
  t.is(cache.get({ ops: { n: 0 } }), undefined, 'the oldest entries are evicted past the cap')
  t.is(cache.get({ ops: { n: 299 } }), 299)
})
