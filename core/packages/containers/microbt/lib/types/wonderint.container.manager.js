'use strict'

const MicroBTManager = require('../microbt.manager.js')
const { CONTAINER_TYPES } = require('../utils/constants.js')

class MicroBTManagerWonderint extends MicroBTManager {
  getThingType () {
    return super.getThingType() + `-${CONTAINER_TYPES.WONDERINT}`
  }

  async connectThing (thg) {
    return await super._connectThing(thg, CONTAINER_TYPES.WONDERINT)
  }
}

module.exports = MicroBTManagerWonderint
