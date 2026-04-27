'use strict'

const { getMinerStaticIpFromThgInfo } = require('../utils/index.js')
const AntminerManager = require('../antminer.manager')

class AntminerManagerS21 extends AntminerManager {
  getThingType () {
    return 'miner-am-s21'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 's21')
  }

  _getDefaultStaticMinerIp (thg) {
    return getMinerStaticIpFromThgInfo(thg)
  }
}

module.exports = AntminerManagerS21
