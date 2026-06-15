'use strict'

const BitdeerManager = require('../bitdeer.manager')

class BitdeerManagerD40M30 extends BitdeerManager {
  getThingType () {
    return super.getThingType() + '-d40-m30'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 'm30')
  }
}

module.exports = BitdeerManagerD40M30
