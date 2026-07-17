'use strict'

const { templates } = require('../../../../../core/mdk')
const { isTransformerPM } = require('./utils')
const { groupBy } = require('../../../../../core/lib-stats/utils')

const { conf, specs: baseSpecs } = templates.stats

module.exports = {
  conf,
  specs: {
    ...baseSpecs,
    powermeter: {
      ...baseSpecs.powermeter_default,
      ops: {
        ...baseSpecs.powermeter_default.ops,
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
  }
}
