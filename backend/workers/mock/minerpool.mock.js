'use strict'

const BaseMock = require('./base.mock')
const HttpTransport = require('./transports/http.transport')

class MinerpoolMock extends BaseMock {
  routes () {
    throw new Error('ERR_ABSTRACT: routes() must return a fastify registrar')
  }

  auth () {
    return null
  }

  createTransport () {
    return new HttpTransport(this, {
      routes: this.routes(),
      auth: this.auth(),
      onClose: this._stateCleanup
    })
  }
}

module.exports = MinerpoolMock
