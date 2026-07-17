'use strict'

const { templates, utils } = require('../../../../../core/mdk')

const { isValidSnap, isOffline } = utils
const baseSpecs = templates.alerts.specs

module.exports = {
  specs: {
    ...baseSpecs,
    powermeter: {
      ...baseSpecs.powermeter_default,
      medium_voltage_low: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.medium_voltage_low
        },
        probe: (ctx, snap) => {
          const voltage = snap.stats.voltage_v
          if (voltage === undefined || voltage === null) return false
          return voltage < ctx.conf.medium_voltage_low.minVoltage
        }
      },
      medium_voltage_high: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.medium_voltage_high
        },
        probe: (ctx, snap) => {
          const voltage = snap.stats.voltage_v
          if (voltage === undefined || voltage === null) return false
          return voltage > ctx.conf.medium_voltage_high.maxVoltage
        }
      }
    }
  }
}
