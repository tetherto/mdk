'use strict'

const BitdeerManager = require('../bitdeer.manager')

class BitdeerManagerD40A1346 extends BitdeerManager {
  getThingType () {
    return super.getThingType() + '-d40-a1346'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 'a1346')
  }
}

module.exports = BitdeerManagerD40A1346
