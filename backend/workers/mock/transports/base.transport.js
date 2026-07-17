'use strict'

const path = require('path')
const { createRequire } = require('module')

class BaseTransport {
  constructor (mock, handlers = {}) {
    this.mock = mock
    this.handlers = handlers
    this.server = null
  }

  get ctx () { return this.mock.ctx }
  get state () { return this.mock.state }

  // Resolve a transport lib from the device (leaf) package, which declares it, rather than from the
  // framework package — keeps the framework dependency-free and works under per-package CI isolation.
  _require (id) {
    return createRequire(path.join(this.mock.constructor.dir, 'server.js'))(id)
  }

  listen (host, port) {
    throw new Error('ERR_ABSTRACT: listen() must be implemented by the transport adapter')
  }

  close () {
    if (this.server && typeof this.server.close === 'function') this.server.close()
  }

  get listening () {
    return !!(this.server && this.server.listening)
  }
}

module.exports = BaseTransport
