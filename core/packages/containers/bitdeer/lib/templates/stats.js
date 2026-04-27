'use strict'

const libStats = require('../../../../tpls/tpl-lib-container/lib/templates/stats')
const { groupBy } = require('miningos-lib-stats/utils')

libStats.specs.container = {
  ...libStats.specs.container_default,
  ops: {
    ...libStats.specs.container_default.ops,
    container_specific_stats_group: {
      op: 'group_multiple_stats',
      srcs: [
        {
          name: 'cold_temp_c_1_group',
          src: 'last.snap.stats.container_specific.cooling_system.oil_pump[0].cold_temp_c'
        },
        {
          name: 'cold_temp_c_2_group',
          src: 'last.snap.stats.container_specific.cooling_system.oil_pump[1].cold_temp_c'
        },
        {
          name: 'hot_temp_c_1_group',
          src: 'last.snap.stats.container_specific.cooling_system.oil_pump[0].hot_temp_c'
        },
        {
          name: 'hot_temp_c_2_group',
          src: 'last.snap.stats.container_specific.cooling_system.oil_pump[1].hot_temp_c'
        },
        {
          name: 'cold_temp_c_w_1_group',
          src: 'last.snap.stats.container_specific.cooling_system.water_pump[0].cold_temp_c'
        },
        {
          name: 'cold_temp_c_w_2_group',
          src: 'last.snap.stats.container_specific.cooling_system.water_pump[1].cold_temp_c'
        },
        {
          name: 'hot_temp_c_w_1_group',
          src: 'last.snap.stats.container_specific.cooling_system.water_pump[0].hot_temp_c'
        },
        {
          name: 'hot_temp_c_w_2_group',
          src: 'last.snap.stats.container_specific.cooling_system.water_pump[1].hot_temp_c'
        },
        {
          name: 'tank1_bar_group',
          src: 'last.snap.stats.container_specific.cooling_system.tank1_bar'
        },
        {
          name: 'tank2_bar_group',
          src: 'last.snap.stats.container_specific.cooling_system.tank2_bar'
        }
      ],
      group: groupBy('info.container')
    }
  }
}

module.exports = libStats
