'use strict'

const PowerMeterMock = require('../../../mock/powermeter.mock')

class SatecMock extends PowerMeterMock {
  static dir = __dirname
  static TYPES = ['pm180']
  static defaultPort = 5020
}

module.exports = SatecMock.expose(module)
