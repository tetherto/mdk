'use strict'

const libStats = require('../../../../tpls/tpl-lib-powermeter/lib/templates/stats')
const { isTransformerPM } = require('./utils')
const { groupBy } = require('../../../../mdk/lib-stats/utils')

libStats.specs.powermeter = {
  ...libStats.specs.powermeter_default,
  ops: {
    ...libStats.specs.powermeter_default.ops,
    site_power_w: {
      op: 'sum',
      src: 'last.snap.stats.power_w',
      filter: entry => (entry?.info?.pos === 'site')
    },
    transformer_power_w: {
      op: 'sum',
      src: 'last.snap.stats.power_w',
      filter: isTransformerPM
    },
    power_w_container_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.power_w',
      group: groupBy('info.container')
    },
    power_w_pos_group: {
      op: 'group',
      src: 'last.snap.stats.power_w',
      group: groupBy('info.pos')
    }
  }
}

module.exports = libStats
