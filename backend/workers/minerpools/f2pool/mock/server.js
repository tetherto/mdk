'use strict'

const MinerpoolMock = require('../../../mock/minerpool.mock')

class F2poolMock extends MinerpoolMock {
  static dir = __dirname
  static defaultPort = 8000
  static extraCliOptions = {
    usernames: { type: 'string', description: 'comma-separated pool usernames' }
  }

  constructor (ctx = {}) {
    super(ctx)
    const u = this.ctx.usernames
    this.ctx.usernames = Array.isArray(u) ? u : (typeof u === 'string' ? u.split(',') : ['haven7346'])
  }

  routes () {
    return require('./routers/base')
  }

  auth () {
    return (app) => {
      app.addHook('onRequest', (req, res, next) => {
        const apiSecret = req.headers['f2p-api-secret']
        if (!apiSecret || apiSecret !== 'secret-key') {
          return res.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or missing API secret' })
        }
        next()
      })
    }
  }
}

module.exports = F2poolMock.expose(module)
