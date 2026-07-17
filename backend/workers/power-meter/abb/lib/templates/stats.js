'use strict'

const { templates } = require('../../../../../core/mdk')
const { groupBy } = require('../../../../../core/lib-stats/utils')

const { conf, specs: baseSpecs } = templates.stats

module.exports = {
  conf,
  specs: {
    ...baseSpecs,
    powermeter: {
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
  }
}
