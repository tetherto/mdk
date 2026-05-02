'use strict'

const libStats = require('../../../../tpls/tpl-lib-thing/lib/templates/stats')
const { groupBy } = require('../../../../mdk/lib-stats/utils')

libStats.specs.powermeter = {
  ops: {
    site_power_w: {
      op: 'sum',
      src: 'last.snap.stats.power_w',
      filter: (entry, ext) => ext?.info?.pos === 'site'
    },
    power_w_container_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.power_w',
      group: groupBy('info.container')
    }
  }
}

module.exports = libStats
