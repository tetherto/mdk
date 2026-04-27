'use strict'

const libAlerts = require('../../../../tpls/tpl-lib-container/lib/templates/alerts')
const libUtils = require('../../../../tpls/tpl-lib-container/lib/utils')

libAlerts.specs.container = {
  ...libAlerts.specs.container_default,
  oil_min_inlet_temp_warn: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.oil_min_inlet_temp_warn && snap.stats.container_specific?.cooling_system?.oil_pump?.length > 0
    },
    probe: (ctx, snap) => {
      return snap.stats.container_specific.cooling_system.oil_pump.some(pump => pump.cold_temp_c < ctx.conf.oil_min_inlet_temp_warn.params.temp)
    }
  }
}

module.exports = libAlerts
