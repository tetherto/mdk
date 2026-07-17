'use strict'

const { templates, utils } = require('../../../../../core/mdk')

const { isValidSnap, isOffline } = utils
const baseSpecs = templates.alerts.specs

module.exports = {
  specs: {
    ...baseSpecs,
    container: {
      ...baseSpecs.container_default,
      oil_min_inlet_temp_warn: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.oil_min_inlet_temp_warn && snap.stats.container_specific?.cooling_system?.oil_pump?.length > 0
        },
        probe: (ctx, snap) => {
          return snap.stats.container_specific.cooling_system.oil_pump.some(pump => pump.cold_temp_c < ctx.conf.oil_min_inlet_temp_warn.params.temp)
        }
      }
    }
  }
}
