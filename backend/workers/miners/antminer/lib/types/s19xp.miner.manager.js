'use strict'

const AntminerManager = require('../antminer.manager')

class AntminerManagerS19xp extends AntminerManager {
  getThingType () {
    return 'miner-am-s19xp'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 's19xp')
  }
}

module.exports = AntminerManagerS19xp
