'use strict'

const libAlerts = require('../../../base/lib/templates/alerts')
const libUtils = require('../../../base/lib/utils')

libAlerts.specs.container = {
  ...libAlerts.specs.container_default,

  supply_liquid_temp_low: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.supply_liquid_temp_low && snap.config?.container_specific?.supply_liquid_temp
    },
    probe: (ctx, snap) => {
      return snap.config.container_specific.supply_liquid_temp < ctx.conf.supply_liquid_temp_low.params.temp
    }
  }
}

module.exports = libAlerts
