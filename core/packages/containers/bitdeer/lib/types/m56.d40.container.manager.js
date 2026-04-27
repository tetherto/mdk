'use strict'

const BitdeerManager = require('../bitdeer.manager')

class BitdeerManagerD40M56 extends BitdeerManager {
  getThingType () {
    return super.getThingType() + '-d40-m56'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 'm56')
  }
}

module.exports = BitdeerManagerD40M56
