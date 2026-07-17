'use strict'

const { templates, utils } = require('../../../../../core/mdk')

const { isValidSnap, isOffline } = utils
const baseSpecs = templates.alerts.specs

function getLastPos (tag) {
  const a = tag.split('_')
  return a[a.length - 1]
}

module.exports = {
  specs: {
    ...baseSpecs,
    sensor: {
      cabinet_temp_high: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.cabinet_temp_high && getLastPos(ctx.info.pos).startsWith('lv') && snap.stats.temp_c < 850
        },
        probe: (ctx, snap) => {
          const a = snap.stats.temp_c > ctx.conf.cabinet_temp_high.params.temp
          return a || false
        }
      },
      cabinet_temp_alert: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.cabinet_temp_alert && getLastPos(ctx.info.pos).startsWith('lv') && snap.stats.temp_c < 850
        },
        probe: (ctx, snap) => {
          const a = snap.stats.temp_c > ctx.conf.cabinet_temp_alert.params.temp
          return a || false
        }
      },
      oil_temp_high: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.oil_temp_high && getLastPos(ctx.info.pos).startsWith('tr') && snap.stats.temp_c < 850
        },
        probe: (ctx, snap) => {
          const a = snap.stats.temp_c > ctx.conf.oil_temp_high.params.temp
          return a || false
        }
      },
      oil_temp_critical: {
        valid: (ctx, snap) => {
          return isValidSnap(snap) && !isOffline(snap) && ctx.conf.oil_temp_critical && getLastPos(ctx.info.pos).startsWith('tr') && snap.stats.temp_c < 850
        },
        probe: (ctx, snap) => {
          const a = snap.stats.temp_c > ctx.conf.oil_temp_critical.params.temp
          return a || false
        }
      }
    }
  }
}
