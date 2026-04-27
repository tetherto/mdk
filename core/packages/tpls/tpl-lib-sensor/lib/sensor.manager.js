'use strict'

const ThingManager = require('../../../tpls/tpl-lib-thing/lib/thing.manager')

class SensorManger extends ThingManager {
  async init () {
    await super.init()

    // buildStats to store real-time-data
    this.scheduleAddlStatTfs = [
      ['rtd', '*/10 * * * * *']
    ]
  }

  getThingType () {
    return 'sensor'
  }

  _getThingBaseType () {
    return 'sensor'
  }
}

module.exports = SensorManger
