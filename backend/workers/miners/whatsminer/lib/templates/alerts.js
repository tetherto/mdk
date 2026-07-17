'use strict'

const { templates, utils } = require('../../../../../core/mdk')

const { isValidSnap, isOffline } = utils
const baseSpecs = templates.alerts.specs

module.exports = {
  specs: {
    ...baseSpecs,
    miner: {
      ...baseSpecs.miner_default,
      pcb_temp_warning: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.pcb_temp_warning
        },
        probe: (ctx, snap) => {
          const a = (
            (snap.config.power_mode === 'low' && snap.stats.temperature_c?.pcb?.some((t) => t.current > ctx.conf.pcb_temp_warning.lowTemp)) ||
            (snap.config.power_mode === 'high' && snap.stats.temperature_c?.pcb?.some((t) => t.current > ctx.conf.pcb_temp_warning.highTemp)) ||
            (snap.config.power_mode === 'normal' && snap.stats.temperature_c?.pcb?.some((t) => t.current > ctx.conf.pcb_temp_warning.normalTemp))
          )
          return a || false
        }
      },
      chip_temp_warning: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.chip_temp_warning
        },
        probe: (ctx, snap) => {
          const a = (
            (snap.config.power_mode === 'low' && snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chip_temp_warning.lowTemp)) ||
            (snap.config.power_mode === 'high' && snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chip_temp_warning.highTemp)) ||
            (snap.config.power_mode === 'normal' && snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chip_temp_warning.normalTemp))
          )
          return a || false
        }
      }
    }
  }
}
