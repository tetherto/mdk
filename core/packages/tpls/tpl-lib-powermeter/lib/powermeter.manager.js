'use strict'

const ThingManager = require('../../../tpls/tpl-lib-thing/lib/thing.manager')

class PowerMeterManager extends ThingManager {
  async init () {
    await super.init()

    // buildStats to store real-time-data
    this.scheduleAddlStatTfs = [
      ['rtd', '*/5 * * * * *']
    ]
  }

  getThingType () {
    return 'powermeter'
  }

  _getThingBaseType () {
    return 'powermeter'
  }

  getSpecTags () {
    return ['powermeter']
  }
}

module.exports = PowerMeterManager
