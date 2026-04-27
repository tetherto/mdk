'use strict'

const libStats = require('../../../tpl-lib-thing/lib/templates/stats')
const { groupBy } = require('miningos-lib-stats/utils')

libStats.specs.container_default = {
  ops: {
    ...libStats.specs.default.ops,
    container_status: {
      op: 'group',
      src: 'last.snap.stats.status',
      group: groupBy('info.container')
    },
    container_power_w_sum: {
      op: 'sum',
      src: 'last.snap.stats.power_w'
    },
    container_power_w: {
      op: 'group',
      src: 'last.snap.stats.power_w',
      group: groupBy('info.container')
    },
    container_nominal_hashrate_mhs_sum: {
      op: 'sum',
      src: 'info.nominalHashrateMhs'
    },
    container_nominal_hashrate_mhs_avg: {
      op: 'avg',
      src: 'info.nominalHashrateMhs'
    },
    container_nominal_efficiency_w_ths_avg: {
      op: 'avg',
      src: 'info.nominalEfficiencyWThs'
    },
    container_nominal_miner_capacity_sum: {
      op: 'sum',
      src: 'info.nominalMinerCapacity'
    }
  }
}

module.exports = libStats
