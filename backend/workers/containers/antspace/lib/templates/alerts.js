'use strict'

const { templates, utils } = require('../../../../../core/mdk')

const { isValidSnap, isOffline } = utils
const baseSpecs = templates.alerts.specs

module.exports = {
  specs: {
    ...baseSpecs,
    container: {
      ...baseSpecs.container_default,

      supply_liquid_temp_low: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.supply_liquid_temp_low && snap.config?.container_specific?.supply_liquid_temp
        },
        probe: (ctx, snap) => {
          return snap.config.container_specific.supply_liquid_temp < ctx.conf.supply_liquid_temp_low.params.temp
        }
      }
    }
  }
}
