'use strict'

const test = require('brittle')
const { applyStats, tallyStats, groupBy, getVal } = require('../../index')
const { getOp } = require('../../ops')

const ENTRIES = [
  { id: 'a', metrics: { hashrate: 100, power: 3000, status: 'mining', temps: [60, 61], pools: { p1: 1 } }, info: { container: 'c1' } },
  { id: 'b', metrics: { hashrate: 50, power: 2900, status: 'mining', temps: [70], pools: { p1: 2, p2: 1 } }, info: { container: 'c1' } },
  { id: 'c', metrics: { hashrate: 0, power: 0, status: 'sleeping', temps: [], pools: {} }, info: { container: 'c2' } },
  { id: 'd', metrics: { hashrate: 20, power: 500, status: 'mining', temps: null } }
]

const mining = (entry) => getVal(entry, 'metrics.status') === 'mining'
const byContainer = groupBy('info.container')

function run (ops) {
  const state = { ops }
  const pack = {}
  for (const entry of ENTRIES) applyStats(state, pack, entry, entry)
  tallyStats(state, pack)
  return pack
}

test('stats ops - scalar ops over a fleet', (t) => {
  const pack = run({
    total: { op: 'sum', src: 'metrics.hashrate' },
    total_mining: { op: 'sum', src: 'metrics.hashrate', filter: mining },
    avg: { op: 'avg', src: 'metrics.power' },
    avg_mining: { op: 'avg', src: 'metrics.power', filter: mining },
    cnt: { op: 'cnt' },
    cnt_mining: { op: 'cnt', filter: mining }
  })
  t.alike(pack, { total: 170, total_mining: 170, avg: 1600, avg_mining: 6400 / 3, cnt: 4, cnt_mining: 3 })
})

test('stats ops - grouped ops skip entries without a group and keep per-group accumulators', (t) => {
  const pack = run({
    sum: { op: 'group_sum', src: 'metrics.hashrate', group: byContainer },
    avg: { op: 'group_avg', src: 'metrics.power', group: byContainer },
    max: { op: 'group_max', src: 'metrics.hashrate', group: byContainer },
    cnt: { op: 'group_cnt', group: byContainer },
    cnt_mining: { op: 'group_cnt', group: byContainer, filter: mining },
    last: { op: 'group', src: 'metrics.status', group: byContainer },
    multi: { op: 'group_multiple_stats', group: byContainer, srcs: [{ name: 'hr', src: 'metrics.hashrate' }, { name: 'st', src: 'metrics.status' }] }
  })
  t.alike({ ...pack.sum }, { c1: 150, c2: 0 })
  t.alike({ ...pack.avg }, { c1: 2950, c2: 0 })
  t.alike({ ...pack.max }, { c1: 100, c2: 0 })
  t.alike({ ...pack.cnt }, { c1: 2, c2: 1 })
  t.alike({ ...pack.cnt_mining }, { c1: 2 })
  t.alike({ ...pack.last }, { c1: 'mining', c2: 'sleeping' })
  t.alike({ ...pack.multi }, { c1: { hr: 50, st: 'mining' }, c2: { hr: 0, st: 'sleeping' } })
})

test('stats ops - grouped ops without a group fn or src accumulate nothing', (t) => {
  const pack = run({
    sum: { op: 'group_sum', src: 'metrics.hashrate' },
    avg: { op: 'group_avg', src: 'metrics.power' },
    max: { op: 'group_max', src: 'metrics.hashrate' },
    cnt: { op: 'group_cnt' },
    last: { op: 'group', group: byContainer },
    multi: { op: 'group_multiple_stats', group: byContainer }
  })
  for (const key of Object.keys(pack)) t.alike({ ...pack[key] }, {}, key)
})

test('stats ops - structural ops concat arrays and objects, filtered or not', (t) => {
  const pack = run({
    temps: { op: 'arr_concat', src: 'metrics.temps' },
    temps_mining: { op: 'arr_concat', src: 'metrics.temps', filter: mining },
    pools: { op: 'obj_concat', src: 'metrics.pools' },
    pools_c2: { op: 'obj_concat', src: 'metrics.pools', filter: (e) => getVal(e, 'info.container') === 'c2' }
  })
  t.alike(pack.temps, [60, 61, 70])
  t.alike(pack.temps_mining, [60, 61, 70])
  t.alike({ ...pack.pools }, { p1: 3, p2: 1 })
  t.alike({ ...pack.pools_c2 }, {})
})

test('stats ops - nested ops apply a per-key op over array items and nested objects', (t) => {
  const rows = [
    { boards: [{ slot: 1, temp: 60 }, { slot: 2, temp: 70 }], site: { rack1: { hr: 10, deep: { hr: 1 } } } },
    { boards: [{ slot: 1, temp: 65 }], site: { rack1: { hr: 5, deep: { hr: 2 } }, rack2: { hr: 7 } } }
  ]
  const state = {
    ops: {
      boards: { op: 'array_obj_calc', src: 'boards', objOps: [{ src: 'temp', op: 'sum' }, { src: 'slot', op: 'sum' }] },
      site: { op: 'nested_obj_concat', src: 'site', nestedOps: [{ src: 'hr', op: 'sum' }] },
      skipped: { op: 'array_obj_calc', src: 'boards', objOps: [{ src: 'temp', op: 'sum' }], filter: () => false }
    }
  }
  const pack = {}
  for (const row of rows) applyStats(state, pack, row)
  tallyStats(state, pack)
  t.alike({ ...pack.boards }, { temp: 195, slot: 4 })
  t.alike(JSON.parse(JSON.stringify(pack.site)), { rack1: { hr: 15, deep: { hr: 3 } }, rack2: { hr: 7 } })
  t.alike({ ...pack.skipped }, {})
})

test('stats ops - a null entry leaves every accumulator untouched; tally resolves empty averages', (t) => {
  const ops = ['sum', 'avg', 'group_sum', 'group_avg', 'group_max', 'group_cnt', 'group', 'group_multiple_stats', 'arr_concat', 'obj_concat', 'nested_obj_concat', 'array_obj_calc', 'alerts_aggr', 'alerts_group_cnt']
  for (const name of ops) {
    const op = { op: name, src: 'x', group: byContainer, srcs: [], objOps: [], nestedOps: [] }
    const cur = getOp(name).calc(op, undefined, null)
    t.ok(cur && 'res' in cur, `${name} initialises on a null entry`)
  }
  t.alike(getOp('avg').tally({}, { acc: 0, cnt: 0, res: 0 }), { res: 0 })
  t.alike({ ...getOp('group_avg').tally({}, { res: { c1: { acc: 0, cnt: 0, res: 0 } } }).res }, { c1: null })
})

test('stats ops - tallyStats skips ops that never accumulated and getVal handles non-string sources', (t) => {
  const state = { ops: { never: { op: 'sum', src: 'x' } } }
  const pack = {}
  tallyStats(state, pack)
  t.alike(pack, {})
  t.is(getVal({ a: 1 }, (e) => e.a * 2), 2)
  t.is(getVal({ a: 1 }, null), null)
  t.is(getVal({ a: 1 }, 42), null)
  t.is(groupBy('info.x')({}, null), null)
})
