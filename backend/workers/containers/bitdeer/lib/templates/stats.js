'use strict'

const { templates } = require('../../../../../core/mdk')
const { groupBy } = require('../../../../../core/lib-stats/utils')

const { conf, specs: baseSpecs } = templates.stats

module.exports = {
  conf,
  specs: {
    ...baseSpecs,
    container: {
      ...baseSpecs.container_default,
      ops: {
        ...baseSpecs.container_default.ops,
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
  }
}
