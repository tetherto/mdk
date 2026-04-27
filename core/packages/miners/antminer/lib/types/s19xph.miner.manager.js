'use strict'

const AntminerManager = require('../antminer.manager')

class AntminerManagerS19xpH extends AntminerManager {
  getThingType () {
    return 'miner-am-s19xp_h'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 's19xp_h')
  }
}

module.exports = AntminerManagerS19xpH
