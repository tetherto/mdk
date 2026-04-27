'use strict'

const SenecaSensorManager = require('../seneca.sensor.manager')

class TempSenecaSensorManager extends SenecaSensorManager {
  getThingType () {
    return super.getThingType() + '-temp-seneca'
  }
}

module.exports = TempSenecaSensorManager
