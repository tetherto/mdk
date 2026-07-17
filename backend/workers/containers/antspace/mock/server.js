'use strict'

const ContainerMock = require('../../../mock/container.mock')
const HttpTransport = require('../../../mock/transports/http.transport')

class AntspaceMock extends ContainerMock {
  static dir = __dirname
  static TYPES = ['hk3', 'immersion']
  static defaultPort = 8000

  createTransport () {
    return new HttpTransport(this, {
      routes: require('./routers/base'),
      onClose: this._stateCleanup
    })
  }
}

module.exports = AntspaceMock.expose(module)
