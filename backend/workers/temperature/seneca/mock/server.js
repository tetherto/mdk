'use strict'

const SensorMock = require('../../../mock/sensor.mock')

class SenecaMock extends SensorMock {
  static dir = __dirname
  static TYPES = ['seneca']
  static defaultPort = 5020
}

module.exports = SenecaMock.expose(module)
