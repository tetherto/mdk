'use strict'

const libAlerts = require('../../../../tpls/tpl-lib-container/lib/templates/alerts')
const libUtils = require('../../../../tpls/tpl-lib-container/lib/utils')

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
