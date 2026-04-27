'use strict'

const PowerMeterManager = require('../../../tpls/tpl-lib-powermeter/lib/powermeter.manager')
const ModbusFacility = require('svc-facs-modbus')

class SchneiderManager extends PowerMeterManager {
  async init () {
    await super.init()
    this.modbus_0 = new ModbusFacility(this, {}, {})
  }

  getThingType () {
    return super.getThingType() + '-schneider'
  }

  getThingTags () {
    return ['schneider']
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

  _createInstance (thg) {
    throw new Error('ERR_NO_IMPL')
  }

  async connectThing (thg) {
    if (!thg.opts.address || !thg.opts.port || thg.opts.unitId === undefined) {
      return 0
    }

    const powermeter = this._createInstance(thg)

    powermeter.on('error', (e) => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = powermeter

    return 1
  }
}

module.exports = SchneiderManager
