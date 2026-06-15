'use strict'

const ABBPowerMeterManager = require('../abb.powermeter.manager')
const M1M20PowerMeter = require('../models/m1m20.powermeter')

class M1M20PowerMeterManager extends ABBPowerMeterManager {
  getThingType () {
    return super.getThingType() + '-m1m20'
  }

  _createInstance (thg) {
    return new M1M20PowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = M1M20PowerMeterManager
