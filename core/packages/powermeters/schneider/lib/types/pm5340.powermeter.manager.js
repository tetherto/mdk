'use strict'

const PM5340PowerMeter = require('../models/pm5340.powemeter')
const SchneiderManager = require('../schneider.manager')

class PM5340PowerMeterManager extends SchneiderManager {
  getThingType () {
    return super.getThingType() + '-pm5340'
  }

  _createInstance (thg) {
    return new PM5340PowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = PM5340PowerMeterManager
