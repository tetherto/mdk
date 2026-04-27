'use strict'

const PowerMeterManager = require('../../../tpls/tpl-lib-powermeter/lib/powermeter.manager')
const ModbusFacility = require('svc-facs-modbus')

class ABBPowerMeterManager extends PowerMeterManager {
  async init () {
    await super.init()
    this.modbus_0 = new ModbusFacility(this, {}, {})
  }

  getThingType () {
    return super.getThingType() + '-abb'
  }

  getThingTags () {
    return ['abb']
  }

  getSpecTags () {
    return ['powermeter']
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  _createInstance (thg) {
    throw new Error('ERR_NO_IMPL')
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

    const powermeter = this._createInstance(thg)

    powermeter.on('error', async e => {
      this.debugThingError(thg, e)
      await this.disconnectThing(thg)
    })

    thg.ctrl = powermeter

    return 1
  }
}

module.exports = ABBPowerMeterManager
