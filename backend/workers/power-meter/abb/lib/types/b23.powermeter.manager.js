'use strict'

const ABBPowerMeterManager = require('../abb.powermeter.manager')
const B2XPowerMeter = require('../models/b2x.powermeter')

class B23PowerMeterManager extends ABBPowerMeterManager {
  getThingType () {
    return super.getThingType() + '-b23'
  }

  _createInstance (thg) {
    return new B2XPowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = B23PowerMeterManager
