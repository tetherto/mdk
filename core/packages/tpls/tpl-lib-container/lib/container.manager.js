'use strict'

const ThingManager = require('../../../tpls/tpl-lib-thing/lib/thing.manager')

class ContainerManager extends ThingManager {
  async init () {
    await super.init()

    // include additional stat timeframes
    this.scheduleAddlStatTfs = [
      ['1m', '0 */1 * * * *'],
      ['20s', '*/20 * * * * *'],
      ['rtd', '*/30 * * * * *']
    ]

    this._addWhitelistedActions([
      ['switchContainer', 1], // [action, reqVotes]
      ['switchSocket', 1],
      ['switchCoolingSystem', 1]
    ])
  }

  getThingType () {
    return 'container'
  }

  _getThingBaseType () {
    return 'container'
  }
}

module.exports = ContainerManager
