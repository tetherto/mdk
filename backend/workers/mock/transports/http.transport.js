'use strict'

const BaseTransport = require('./base.transport')

class HttpTransport extends BaseTransport {
  listen (host, port) {
    const fastify = this._require('fastify')
    const app = fastify({ logger: false })
    this.server = app

    const { routes, auth, onClose } = this.handlers

    if (typeof auth === 'function') auth(app)
    app.addHook('onRequest', (req, _res, next) => {
      req.ctx = this.ctx
      req.state = this.state
      next()
    })
    app.addHook('onSend', (req, _res, _payload, next) => {
      if (req.ctx && req.ctx.delay) setTimeout(next, req.ctx.delay)
      else next()
    })

    routes(app)
    if (typeof onClose === 'function') app.addHook('onClose', onClose)

    this.ready = app.listen({ port, host })
    return app
  }

  close () {
    if (this.server) this.server.close()
  }

  get listening () {
    return !!(this.server && this.server.server && this.server.server.listening)
  }
}

module.exports = HttpTransport
