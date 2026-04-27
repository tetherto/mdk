'use strict'

const PowerMeterManager = require('../../../tpls/tpl-lib-powermeter/lib/powermeter.manager')
const SatecPowerMeter = require('./satec.powermeter')
const ModbusFacility = require('svc-facs-modbus')

class SatecPowerMeterManager extends PowerMeterManager {
  async init () {
    await super.init()
    this.modbus_0 = new ModbusFacility(this, {}, {})
  }

  getThingType () {
    return super.getThingType() + '-satec-pm180'
  }

  getThingTags () {
    return ['satec']
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  selectThingInfo (thg) {
    return {
      address: thg.opts?.address,
      port: thg.opts?.port,
      unitId: thg.opts?.unitId
    }
  }

  async connectThing (thg) {
    if (!thg.opts.address || !thg.opts.port || thg.opts.unitId === undefined) {
      return 0
    }

    const powermeter = new SatecPowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {},
      collectSnapsItvMs: this.conf.thing.collectSnapsItvMs || 60000
    })

    powermeter.on('error', (e) => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = powermeter

    return 1
  }
}

module.exports = SatecPowerMeterManager
