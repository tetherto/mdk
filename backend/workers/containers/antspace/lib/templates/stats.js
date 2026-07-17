'use strict'

const { templates, utils } = require('../../../../../core/mdk')
const { groupBy } = require('../../../../../core/lib-stats/utils')

const { isOffline } = utils
const { conf, specs: baseSpecs } = templates.stats

const createSrcEntries = (fieldNames) => {
  return fieldNames.map(fieldName => ({
    name: `${fieldName}_group`,
    src: `last.snap.stats.container_specific.${fieldName}`
  }))
}

const containerSpecificFields = [
  'distribution_box1_power',
  'distribution_box2_power',
  'supply_liquid_flow',
  'supply_liquid_pressure',
  'return_liquid_pressure',
  'supply_liquid_temp',
  'return_liquid_temp',
  'primary_supply_temp',
  'primary_return_temp',
  'second_supply_temp1',
  'second_return_temp1',
  'second_supply_temp2',
  'second_return_temp2',
  'supply_liquid_set_temp'
]

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
          srcs: createSrcEntries(containerSpecificFields),
          group: groupBy('info.container'),
          filter: entry => {
            return !isOffline(entry.last.snap)
          }
        }
      }
    }
  }
}
