'use strict'

const ABBPowerMeterManager = require('../abb.powermeter.manager')
const B2XPowerMeter = require('../models/b2x.powermeter.js')

class B24PowerMeterManager extends ABBPowerMeterManager {
  getThingType () {
    return super.getThingType() + '-b24'
  }

  _createInstance (thg) {
    return new B2XPowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = B24PowerMeterManager
