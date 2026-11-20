'use strict'

// Static registry of stats ops. Op names come from stats specs (`op.op`,
// `objOps[].op`, `nestedOps[].op`), so they are never turned into a require
// path: an unknown name is refused instead of resolved on disk. Entries are
// lazy because array_obj_calc and nested_obj_concat look ops up themselves.
const OPS = {
  alerts_aggr: () => require('./alerts_aggr'),
  alerts_group_cnt: () => require('./alerts_group_cnt'),
  arr_concat: () => require('./arr_concat'),
  array_obj_calc: () => require('./array_obj_calc'),
  avg: () => require('./avg'),
  cnt: () => require('./cnt'),
  group: () => require('./group'),
  group_avg: () => require('./group_avg'),
  group_cnt: () => require('./group_cnt'),
  group_max: () => require('./group_max'),
  group_multiple_stats: () => require('./group_multiple_stats'),
  group_sum: () => require('./group_sum'),
  nested_obj_concat: () => require('./nested_obj_concat'),
  obj_concat: () => require('./obj_concat'),
  sum: () => require('./sum')
}

function getOp (name) {
  if (typeof name !== 'string' || !Object.hasOwn(OPS, name)) {
    throw new Error(`ERR_STATS_OP_UNKNOWN: ${String(name).slice(0, 64)}`)
  }
  return OPS[name]()
}

module.exports = {
  getOp,
  OP_NAMES: Object.freeze(Object.keys(OPS))
}
