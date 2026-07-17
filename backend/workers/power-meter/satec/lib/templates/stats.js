'use strict'

const { templates, utils } = require('../../../../../core/mdk')
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
        power_w_container_group_sum: {
          op: 'group_sum',
          src: 'last.snap.stats.power_w',
          group: groupBy('info.container')
        },
        powermeter_specific_stats_group: {
          op: 'group_multiple_stats',
          srcs: [
            {
              name: 'real_import_power_w_last15m_avg',
              src: 'last.snap.stats.powermeter_specific.historical_values.real_import_power_w_last15m_avg'
            }
          ],
          group: groupBy('info.pos'),
          filter: entry => {
            if (!entry?.last?.snap?.stats) return false
            return !utils.isOffline(entry.last.snap)
          }
        }
      }
    }
  }
}
