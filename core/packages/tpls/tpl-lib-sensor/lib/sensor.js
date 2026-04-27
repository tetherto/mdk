'use strict'

const Thing = require('../../../tpls/tpl-lib-thing/lib/thing')

class Sensor extends Thing {
  constructor (opts) {
    super('sensor', opts)

    this.cache = null
  }

  async getRealtimeData () {
    // snap is read at short intervals, return data from cache
    return await this._prepSnap(true)
  }
}

module.exports = Sensor
