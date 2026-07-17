'use strict'

const MinerpoolMock = require('../../../mock/minerpool.mock')

class OceanMock extends MinerpoolMock {
  static dir = __dirname
  static defaultPort = 8000
  static useControlAgent = false

  routes () {
    return require('./routers/base')
  }
}

module.exports = OceanMock.expose(module)
