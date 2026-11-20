'use strict'

const test = require('brittle')
const { applyStats, tallyStats, mergeStats, groupBy, getVal } = require('../../index')
const { getOp, OP_NAMES } = require('../../ops')

const ENTRIES = [
  { id: 'a', metrics: { hashrate: 100, power: 3000, status: 'mining', temps: [60, 61], pools: { p1: 1 } }, info: { container: 'c1' } },
  { id: 'b', metrics: { hashrate: 50, power: 2900, status: 'mining', temps: [70], pools: { p1: 2, p2: 1 } }, info: { container: 'c1' } },
  { id: 'c', metrics: { hashrate: 0, power: 0, status: 'sleeping', temps: [], pools: {} }, info: { container: 'c2' } },
  { id: 'd', metrics: { hashrate: 20, power: 500, status: 'mining', temps: null } }
]

const ROWS = [
  { boards: [{ slot: 1, temp: 60 }, { slot: 2, temp: 70 }], site: { rack1: { hr: 10, deep: { hr: 1 } } } },
  { boards: [{ slot: 1, temp: 65 }], site: { rack1: { hr: 5, deep: { hr: 2 } }, rack2: { hr: 7 } } },
  { boards: [{ slot: 3, temp: 80 }], site: { rack1: { hr: 1, deep: { hr: 4 } }, rack2: { hr: 3 } } }
]

const mining = (entry) => getVal(entry, 'metrics.status') === 'mining'
const byContainer = groupBy('info.container')

const FLEET_OPS = {
  total: { op: 'sum', src: 'metrics.hashrate' },
  total_mining: { op: 'sum', src: 'metrics.hashrate', filter: mining },
  avg: { op: 'avg', src: 'metrics.power' },
  avg_mining: { op: 'avg', src: 'metrics.power', filter: mining },
  cnt: { op: 'cnt' },
  cnt_mining: { op: 'cnt', filter: mining },
  gsum: { op: 'group_sum', src: 'metrics.hashrate', group: byContainer },
  gavg: { op: 'group_avg', src: 'metrics.power', group: byContainer },
  gmax: { op: 'group_max', src: 'metrics.hashrate', group: byContainer },
  gcnt: { op: 'group_cnt', group: byContainer },
  gcnt_mining: { op: 'group_cnt', group: byContainer, filter: mining },
  last: { op: 'group', src: 'metrics.status', group: byContainer },
  multi: { op: 'group_multiple_stats', group: byContainer, srcs: [{ name: 'hr', src: 'metrics.hashrate' }, { name: 'st', src: 'metrics.status' }] },
  temps: { op: 'arr_concat', src: 'metrics.temps' },
  temps_mining: { op: 'arr_concat', src: 'metrics.temps', filter: mining },
  pools: { op: 'obj_concat', src: 'metrics.pools' },
  pools_c2: { op: 'obj_concat', src: 'metrics.pools', filter: (e) => getVal(e, 'info.container') === 'c2' }
}

const NESTED_OPS = {
  boards: { op: 'array_obj_calc', src: 'boards', objOps: [{ src: 'temp', op: 'sum' }, { src: 'slot', op: 'sum' }] },
  site: { op: 'nested_obj_concat', src: 'site', nestedOps: [{ src: 'hr', op: 'sum' }] },
  skipped: { op: 'array_obj_calc', src: 'boards', objOps: [{ src: 'temp', op: 'sum' }], filter: () => false }
}

const ALL_OPS = { ...FLEET_OPS, ...NESTED_OPS }
const MERGEABLE = OP_NAMES.filter(name => !name.startsWith('alerts_'))
const HOSTILE = ['__proto__', 'constructor', 'prototype']

const clone = (v) => JSON.parse(JSON.stringify(v))

// Folding mutates the objects the first entry contributed, so every fold
// works on its own copy of the fixture.
function fold (ops, entries) {
  const pack = {}
  for (const entry of clone(entries)) applyStats({ ops }, pack, entry, entry)
  return pack
}

function tallied (ops, pack) {
  tallyStats({ ops }, pack)
  return clone(pack)
}

function assertPrototypeClean (t) {
  const probe = {}
  for (const k of ['acc', 'cnt', 'res', 'x', 'polluted', 'high', 'hr']) {
    t.is(probe[k], undefined, `Object.prototype.${k} untouched`)
  }
  t.is(Object.getPrototypeOf(probe), Object.prototype)
}

test('stats merge - partial packs merged then tallied equal one pack folded over every entry', (t) => {
  t.alike(new Set(Object.values(ALL_OPS).map(o => o.op)), new Set(MERGEABLE), 'fixtures cover every mergeable op')
  const fixtures = [
    ['fleet', FLEET_OPS, ENTRIES, [[0], [1], [2], [4], [1, 3]]],
    ['nested', NESTED_OPS, ROWS, [[0], [1], [2], [3], [1, 2]]]
  ]
  for (const [name, ops, entries, splits] of fixtures) {
    const expected = tallied(ops, fold(ops, entries))
    for (const bounds of splits) {
      const edges = [0, ...bounds, entries.length]
      const packs = edges.slice(1).map((end, i) => fold(ops, entries.slice(edges[i], end)))
      const merged = tallied(ops, mergeStats({ ops }, packs))
      for (const ok of Object.keys(ops)) {
        t.alike(merged[ok], expected[ok], `${name}.${ok} (${ops[ok].op}) split at ${bounds.join(',')}`)
      }
    }
  }
})

test('stats merge - an undefined side passes the other side through; both missing yields an empty accumulator', (t) => {
  const specs = ALL_OPS
  const full = fold(specs, ENTRIES)
  for (const ok of Object.keys(FLEET_OPS)) {
    const met = getOp(specs[ok].op)
    t.is(met.merge(specs[ok], undefined, full[ok]), full[ok], `${ok} keeps right side`)
    t.is(met.merge(specs[ok], full[ok], undefined), full[ok], `${ok} keeps left side`)
  }
  for (const name of MERGEABLE) {
    const op = { op: name, src: 'x', group: byContainer, srcs: [], objOps: [], nestedOps: [] }
    const empty = getOp(name).merge(op, undefined, undefined)
    const expected = name === 'cnt' ? { res: 0 } : getOp(name).calc(op, undefined, null)
    t.alike(clone(empty), clone(expected), `${name} empty accumulator`)
    t.ok('res' in empty, `${name} has a res`)
  }
  const nothing = mergeStats({ ops: specs }, [{}, {}])
  t.alike(Object.keys(nothing).sort(), Object.keys(specs).sort())
  t.alike(tallied(specs, mergeStats({ ops: specs }, [])), tallied(specs, clone(nothing)), 'no packs tallies like empty packs')
  t.alike(tallied(specs, nothing), {
    total: 0,
    total_mining: 0,
    avg: 0,
    avg_mining: 0,
    cnt: 0,
    cnt_mining: 0,
    gsum: {},
    gavg: {},
    gmax: {},
    gcnt: {},
    gcnt_mining: {},
    last: {},
    multi: {},
    temps: [],
    temps_mining: [],
    pools: {},
    pools_c2: {},
    boards: {},
    site: {},
    skipped: {}
  })
})

test('stats merge - hostile keys in partial packs never reach Object.prototype', (t) => {
  const ops = {
    gsum: { op: 'group_sum', src: 'x', group: byContainer },
    gavg: { op: 'group_avg', src: 'x', group: byContainer },
    gmax: { op: 'group_max', src: 'x', group: byContainer },
    gcnt: { op: 'group_cnt', group: byContainer },
    last: { op: 'group', src: 'x', group: byContainer },
    multi: { op: 'group_multiple_stats', srcs: [{ name: 'v', src: 'x' }], group: byContainer },
    oc: { op: 'obj_concat', src: 'x' },
    noc: { op: 'nested_obj_concat', src: 'x', nestedOps: [{ src: 'hr', op: 'sum' }] },
    aoc: { op: 'array_obj_calc', src: 'x', objOps: [{ src: 'hr', op: 'sum' }, { src: '__proto__', op: 'sum' }] }
  }
  // Packs arrive over the wire, so `__proto__` is an own enumerable key the
  // way JSON.parse produces it.
  const hostilePack = (num, obj) => {
    const res = HOSTILE.map(k => `"${k}":${obj ? '{"polluted":1,"hr":1}' : num}`).join(',')
    return JSON.parse(`{"res":{${res},"c1":${obj ? '{"hr":2}' : num}}}`)
  }
  const avgPack = () => JSON.parse('{"res":{"__proto__":{"acc":1,"cnt":1,"polluted":1},"c1":{"acc":4,"cnt":2,"res":0}}}')
  const packs = [{}, {}].map(() => ({
    gsum: hostilePack(1),
    gavg: avgPack(),
    gmax: hostilePack(3),
    gcnt: hostilePack(2),
    last: hostilePack(5),
    multi: hostilePack(0, true),
    oc: hostilePack(1),
    noc: hostilePack(0, true),
    aoc: JSON.parse('{"res":{"__proto__":{"polluted":1},"hr":2}}')
  }))
  const merged = mergeStats({ ops }, packs)
  assertPrototypeClean(t)
  for (const ok of Object.keys(ops)) {
    t.alike(Object.keys(merged[ok].res), ok === 'aoc' ? ['hr'] : ['c1'], `${ok} keeps only safe keys`)
    t.is(Object.getPrototypeOf(merged[ok].res), null, `${ok} result map has no prototype`)
  }
  tallyStats({ ops }, merged)
  t.is(merged.gsum.c1, 2)
  t.is(merged.gavg.c1, 2)
  t.is(merged.gmax.c1, 3)
  t.is(merged.gcnt.c1, 4)
  t.is(merged.last.c1, 5)
  t.alike({ ...merged.multi.c1 }, { hr: 2 })
  t.is(merged.oc.c1, 2)
  t.is(merged.noc.c1.hr, 4)
  t.is(merged.aoc.hr, 4)
  assertPrototypeClean(t)
})

test('stats merge - mergeStats refuses an op without merge', (t) => {
  for (const name of ['alerts_aggr', 'alerts_group_cnt']) {
    t.absent(getOp(name).merge, `${name} has no merge`)
    const state = { ops: { total: { op: 'sum', src: 'x' }, al: { op: name, src: 'x' } } }
    t.exception(() => mergeStats(state, [{ total: { res: 1 } }, { total: { res: 2 } }]), new RegExp(`ERR_STATS_OP_NOT_MERGEABLE: ${name}`))
  }
  t.exception(() => mergeStats({ ops: { a: { op: '../utils' } } }, [{}]), /ERR_STATS_OP_UNKNOWN/)
})

test('stats merge - inputs are not mutated and the result shares no accumulator with them', (t) => {
  const ops = ALL_OPS
  const single = fold(ops, ENTRIES)
  const singleBefore = JSON.stringify(single)
  const singleMerged = mergeStats({ ops }, [single])
  for (const ok of Object.keys(ops)) t.not(singleMerged[ok], single[ok], `${ok} not aliased from a single pack`)
  tallyStats({ ops }, singleMerged)
  t.is(JSON.stringify(single), singleBefore, 'single pack untouched after merge and tally')
  t.alike(clone(singleMerged), tallied(ops, fold(ops, ENTRIES)), 'single pack tallies like the fold')

  const packs = [fold(ops, ENTRIES.slice(0, 2)), fold(ops, ENTRIES.slice(2))]
  packs[0].boards = fold(NESTED_OPS, ROWS.slice(0, 1)).boards
  packs[1].boards = fold(NESTED_OPS, ROWS.slice(1)).boards
  packs[0].site = fold(NESTED_OPS, ROWS.slice(0, 1)).site
  packs[1].site = fold(NESTED_OPS, ROWS.slice(1)).site
  const before = JSON.stringify(packs)
  const merged = mergeStats({ ops }, packs)
  for (const ok of Object.keys(ops)) {
    for (const pack of packs) {
      t.not(merged[ok], pack[ok], `${ok} accumulator is new`)
      if (typeof pack[ok].res === 'object' && pack[ok].res !== null) {
        t.not(merged[ok].res, pack[ok].res, `${ok} res is new`)
      }
    }
  }
  tallyStats({ ops }, merged)
  t.is(JSON.stringify(packs), before, 'partial packs untouched after merge and tally')
  t.is(merged.total, 170)
  t.is(merged.site.rack1.hr, 16)
})

test('stats merge - nested_obj_concat: nested keys must be present from the first entry of every partial pack', (t) => {
  const ops = { site: { op: 'nested_obj_concat', src: 'site', nestedOps: [{ src: 'hr', op: 'sum' }] } }
  const rows = [
    { site: { rack1: { hr: 1, deep: { hr: 1 } } } },
    { site: { rack1: { hr: 1 } } },
    { site: { rack1: { hr: 1, deep: { hr: 5 } } } }
  ]
  const expected = tallied(ops, fold(ops, rows))
  t.alike(expected.site, { rack1: { hr: 3, deep: { hr: 6 } } })

  const holds = [fold(ops, rows.slice(0, 2)), fold(ops, rows.slice(2))]
  t.alike(tallied(ops, mergeStats({ ops }, holds)).site, expected.site, 'deep present on the first entry of both partials')

  // Known limitation: `calc` drops a nested key the first entry of a pack did
  // not carry, so a partial whose first entry lacks `deep` loses every later
  // `deep` and the merge cannot recover it.
  const lossy = [fold(ops, rows.slice(0, 1)), fold(ops, rows.slice(1))]
  const merged = tallied(ops, mergeStats({ ops }, lossy)).site
  t.comment(`partial starting without deep: merged deep.hr = ${merged.rack1.deep.hr}, fold = ${expected.site.rack1.deep.hr}`)
})
