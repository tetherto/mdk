'use strict'

const ABBPowerMeterManager = require('../abb.powermeter.manager')
const REU615PowerMeter = require('../models/reu615.powermeter')

class REU615PowerMeterManager extends ABBPowerMeterManager {
  getThingType () {
    return super.getThingType() + '-reu615'
  }

  _createInstance (thg) {
    return new REU615PowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = REU615PowerMeterManager
