'use strict'

const ABBPowerMeterManager = require('../abb.powermeter.manager')
const M4M20PowerMeter = require('../models/m4m20.powermeter')

class M4M20PowerMeterManager extends ABBPowerMeterManager {
  getThingType () {
    return super.getThingType() + '-m4m20'
  }

  _createInstance (thg) {
    return new M4M20PowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = M4M20PowerMeterManager
