'use strict'

const { getMinerStaticIpFromThgInfo } = require('../utils/index')
const AntminerManager = require('../antminer.manager')

class AntminerManagerS21pro extends AntminerManager {
  getThingType () {
    return 'miner-am-s21pro'
  }

  async connectThing (thg) {
    return this._connectThing(thg, 's21pro')
  }

  _getDefaultStaticMinerIp (thg) {
    return getMinerStaticIpFromThgInfo(thg)
  }
}

module.exports = AntminerManagerS21pro
