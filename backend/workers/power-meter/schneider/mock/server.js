'use strict'

const PowerMeterMock = require('../../../mock/powermeter.mock')

class SchneiderMock extends PowerMeterMock {
  static dir = __dirname
  static TYPES = ['pm5340', 'p3u30']
  static defaultPort = 5020
}

module.exports = SchneiderMock.expose(module)
