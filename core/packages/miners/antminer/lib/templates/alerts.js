'use strict'

const libAlerts = require('../../../../tpls/tpl-lib-miner/lib/templates/alerts')
const libUtils = require('../../../../tpls/tpl-lib-thing/lib/utils')

libAlerts.specs.miner = {
  ...libAlerts.specs.miner_default,

  max_outlet_temp_warning: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.max_outlet_temp_warning && snap.stats.temperature_c?.temp?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbOutlets = snap.stats.temperature_c.temp.map((t) => t.pcbOutlet)
      if (pcbOutlets.length > 0) {
        return pcbOutlets.some((pcbOutlet) => (pcbOutlet >= ctx.conf.max_outlet_temp_warning.params.temp))
      }
      return false
    }
  },
  max_pcb_temp_warning: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.max_pcb_temp_warning && snap.stats.temperature_c?.raw_temps?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbs = snap.stats.temperature_c.raw_temps.map((t) => t.pcb)
      if (pcbs.length > 0) {
        return pcbs.some((pcb) => pcb >= ctx.conf.max_pcb_temp_warning.params.temp)
      }
      return false
    }
  },
  max_pcb_temp_critical: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.max_pcb_temp_critical && snap.stats.temperature_c?.raw_temps?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbs = snap.stats.temperature_c.raw_temps.map((t) => t.pcb)
      if (pcbs.length > 0) {
        return pcbs.some((pcb) => pcb >= ctx.conf.max_pcb_temp_critical.params.temp)
      }
      return false
    }
  },
  max_inlet_temp_warning: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.max_inlet_temp_warning && snap.stats.temperature_c?.temp?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbInlets = snap.stats.temperature_c.temp.map((t) => t.pcbInlet)
      if (pcbInlets.length > 0) {
        return pcbInlets.some((pcbInlet) => (ctx.conf.max_inlet_temp_critical.params.temp ? ctx.conf.max_inlet_temp_critical.params.temp >= pcbInlet >= ctx.conf.max_inlet_temp_warning.params.temp : pcbInlet >= ctx.conf.max_inlet_temp_warning.params.temp))
      }
      return false
    }
  },
  max_inlet_temp_critical: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.max_inlet_temp_critical && snap.stats.temperature_c?.temp?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbInlets = snap.stats.temperature_c.temp.map((t) => t.pcbInlet)
      if (pcbInlets.length > 0) {
        return pcbInlets.some((pcbInlet) => (pcbInlet >= ctx.conf.max_inlet_temp_critical.params.temp))
      }
      return false
    }
  },
  min_inlet_temp_warning: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.min_inlet_temp_warning && snap.stats.temperature_c?.temp?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbInlets = snap.stats.temperature_c.temp.map((t) => t.pcbInlet)
      if (pcbInlets.length > 0) {
        return pcbInlets.some((pcbInlet) => (pcbInlet <= ctx.conf.min_inlet_temp_warning.params.temp))
      }
      return false
    }
  },
  min_inlet_temp_critical: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.min_inlet_temp_critical && snap.stats.temperature_c?.temp?.length > 0
    },
    probe: (ctx, snap) => {
      const pcbInlets = snap.stats.temperature_c.temp.map((t) => t.pcbInlet)
      if (pcbInlets.length > 0) {
        return pcbInlets.some((pcbInlet) => (pcbInlet <= ctx.conf.min_inlet_temp_critical.params.temp))
      }
      return false
    }
  }
}

module.exports = libAlerts
