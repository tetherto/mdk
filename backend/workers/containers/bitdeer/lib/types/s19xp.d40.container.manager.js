'use strict'

const BitdeerManager = require('../bitdeer.manager')

class BitdeerManagerD40S19XP extends BitdeerManager {
  getThingType () {
    return super.getThingType() + '-d40-s19xp'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 's19xp')
  }
}

module.exports = BitdeerManagerD40S19XP
