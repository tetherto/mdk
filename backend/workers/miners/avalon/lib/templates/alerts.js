'use strict'

const { templates, utils } = require('../../../../../core/mdk')

const { isValidSnap, isOffline } = utils
const baseSpecs = templates.alerts.specs

module.exports = {
  specs: {
    ...baseSpecs,
    miner: {
      ...baseSpecs.miner_default,

      chips_temp_critical: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.chips_temp_critical
        },
        probe: (ctx, snap) => {
          const a = snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chips_temp_critical.params.temp)
          return a || false
        }
      }
    }
  }
}
