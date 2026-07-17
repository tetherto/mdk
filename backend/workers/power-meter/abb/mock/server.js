'use strict'

const PowerMeterMock = require('../../../mock/powermeter.mock')

class AbbMock extends PowerMeterMock {
  static dir = __dirname
  static TYPES = ['b23', 'b24', 'm1m20', 'reu615', 'm4m20']
  static defaultPort = 5020
}

module.exports = AbbMock.expose(module)
