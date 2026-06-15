'use strict'

const MicroBTManager = require('../microbt.manager.js')
const { CONTAINER_TYPES } = require('../utils/constants.js')

class MicroBTManagerKehua extends MicroBTManager {
  getThingType () {
    return super.getThingType() + `-${CONTAINER_TYPES.KEHUA}`
  }

  async connectThing (thg) {
    return await super._connectThing(thg, CONTAINER_TYPES.KEHUA)
  }
}

module.exports = MicroBTManagerKehua
