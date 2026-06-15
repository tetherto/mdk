'use strict'

const P3U30PowerMeter = require('../models/p3u30.powermeter')
const SchneiderManager = require('../schneider.manager')

class P3U30PowerMeterManager extends SchneiderManager {
  getThingType () {
    return super.getThingType() + '-p3u30'
  }

  _createInstance (thg) {
    return new P3U30PowerMeter({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.powermeter || {}
    })
  }
}

module.exports = P3U30PowerMeterManager
