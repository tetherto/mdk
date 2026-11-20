'use strict'

const test = require('brittle')
const libStats = require('../../index')
const { getOp, OP_NAMES } = require('../../ops')
const { isSafeKey } = require('../../utils')

const HOSTILE = ['__proto__', 'constructor', 'prototype']

function assertPrototypeClean (t) {
  const probe = {}
  for (const k of ['acc', 'cnt', 'res', 'x', 'polluted', 'high']) {
    t.is(probe[k], undefined, `Object.prototype.${k} untouched`)
  }
  t.is(Object.getPrototypeOf(probe), Object.prototype)
}

test('stats ops - a hostile info.container cannot pollute Object.prototype', (t) => {
  const groupByContainer = libStats.groupBy('info.container')
  const state = {
    ops: {
      avg: { op: 'group_avg', src: 'last.v', group: groupByContainer },
      sum: { op: 'group_sum', src: 'last.v', group: groupByContainer },
      cnt: { op: 'group_cnt', group: groupByContainer },
      max: { op: 'group_max', src: 'last.v', group: groupByContainer },
      grp: { op: 'group', src: 'last.v', group: groupByContainer },
      multi: { op: 'group_multiple_stats', srcs: [{ name: 'v', src: 'last.v' }], group: groupByContainer }
    }
  }
  const pack = {}
  for (const container of [...HOSTILE, 'c1', 'c1']) {
    libStats.applyStats(state, pack, { last: { v: 4 }, info: { container } }, { info: { container } })
  }
  libStats.tallyStats(state, pack)

  assertPrototypeClean(t)
  t.alike(Object.keys(pack.avg), ['c1'], 'hostile groups skipped')
  t.is(pack.avg.c1, 4)
  t.is(pack.sum.c1, 8)
  t.is(pack.cnt.c1, 2)
  t.is(pack.max.c1, 4)
  t.is(pack.grp.c1, 4)
  t.alike({ ...pack.multi.c1 }, { v: 4 })
  t.is(Object.getPrototypeOf(pack.avg), null, 'result map has no prototype')
  t.is(JSON.stringify(pack.sum), '{"c1":8}', 'null-prototype maps serialise normally')
})

test('stats ops - hostile object keys in snapshots are skipped', (t) => {
  const state = {
    ops: {
      oc: { op: 'obj_concat', src: 'last.o' },
      noc: { op: 'nested_obj_concat', src: 'last.o', nestedOps: [{ op: 'sum', src: 'x' }] },
      aggr: { op: 'alerts_aggr', src: 'last.o' },
      sev: { op: 'alerts_group_cnt', src: 'last.alerts' },
      aoc: { op: 'array_obj_calc', src: 'last.arr', objOps: [{ op: 'sum', src: 'x' }] }
    }
  }
  const pack = {}
  for (let i = 0; i < 3; i++) {
    // JSON.parse makes `__proto__` an own, enumerable key — the shape a device
    // snapshot arrives in.
    const o = JSON.parse('{"__proto__":{"x":1,"polluted":1},"constructor":{"x":1},"k":{"x":2}}')
    const alerts = JSON.parse('[{"severity":"__proto__"},{"severity":"high"}]')
    const arr = [{ x: 1 }]
    libStats.applyStats(state, pack, { last: { o, alerts, arr } }, {})
  }
  libStats.tallyStats(state, pack)

  assertPrototypeClean(t)
  t.alike(Object.keys(pack.oc), ['k'])
  t.alike(Object.keys(pack.noc), ['k'])
  t.is(pack.noc.k.x, 6)
  t.alike(Object.keys(pack.sev), ['high'])
  t.is(pack.sev.high, 3)
  t.is(pack.aoc.x, 3)
})

test('stats ops - op names come from a static map', (t) => {
  for (const name of OP_NAMES) t.is(typeof getOp(name).calc, 'function', `${name} loads`)
  for (const bad of ['../utils', '../../index', 'group_sum.js', '/etc/passwd', 'constructor', '__proto__', 'hasOwnProperty', undefined, 5]) {
    t.exception(() => getOp(bad), /ERR_STATS_OP_UNKNOWN/, `refuses ${String(bad)}`)
  }
  t.exception(() => libStats.applyStats({ ops: { a: { op: '../utils' } } }, {}, {}, {}), /ERR_STATS_OP_UNKNOWN/)
  t.exception(() => libStats.tallyStats({ ops: { a: { op: '../utils' } } }, { a: { res: 1 } }), /ERR_STATS_OP_UNKNOWN/)
  const nested = { ops: { n: { op: 'nested_obj_concat', src: 'o', nestedOps: [{ op: '../utils', src: 'x' }] } } }
  const pack = {}
  libStats.applyStats(nested, pack, { o: { k: { x: 1 } } }, {})
  t.exception(() => libStats.applyStats(nested, pack, { o: { k: { x: 1 } } }, {}), /ERR_STATS_OP_UNKNOWN/)
})

test('stats ops - isSafeKey', (t) => {
  for (const k of HOSTILE) t.absent(isSafeKey(k))
  for (const k of ['c1', 'rack-1', 0, 3]) t.ok(isSafeKey(k))
})
