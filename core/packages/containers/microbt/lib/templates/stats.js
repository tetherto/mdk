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
          name: 'unit_inlet_pressure_p2_group',
          src: 'last.snap.stats.container_specific.cdu.unit_inlet_pressure_p2'
        },
        {
          name: 'unit_outlet_pressure_p3_group',
          src: 'last.snap.stats.container_specific.cdu.unit_outlet_pressure_p3'
        },
        {
          name: 'circulation_pump_inlet_pressure_p1_group',
          src: 'last.snap.stats.container_specific.cdu.circulation_pump_inlet_pressure_p1'
        },
        {
          name: 'circulation_pump_outlet_pressure_p5_group',
          src: 'last.snap.stats.container_specific.cdu.circulation_pump_outlet_pressure_p5'
        },
        {
          name: 'filter_pressure_difference_group',
          src: 'last.snap.stats.container_specific.cdu.filter_pressure_difference'
        },
        {
          name: 'makeup_water_pump_fault_group',
          src: 'last.snap.stats.container_specific.cdu.makeup_water_pump_fault'
        },
        {
          name: 'unit_inlet_temp_t2_group',
          src: 'last.snap.stats.container_specific.cdu.unit_inlet_temp_t2'
        },
        {
          name: 'cooling_temp_t1_group',
          src: 'last.snap.stats.container_specific.cdu.cooling_temp_t1'
        }
      ],
      group: groupBy('info.container')
    }
  }
}

module.exports = libStats
