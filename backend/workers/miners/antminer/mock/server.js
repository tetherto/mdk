'use strict'

const MinerMock = require('../../../mock/miner.mock')
const HttpTransport = require('../../../mock/transports/http.transport')

class AntminerMock extends MinerMock {
  static dir = __dirname
  static TYPES = ['s19xp', 's19xp_h', 's21', 's21pro']
  static defaultPort = 8000
  static extraCliOptions = {
    password: { type: 'string', default: 'root' },
    minerpoolMockPort: { type: 'number', default: 8000 },
    minerpoolMockHost: { type: 'string', default: '127.0.0.1' }
  }

  createTransport () {
    return new HttpTransport(this, {
      routes: require(`./routers/${this.ctx.type.toLowerCase()}`),
      auth: this._digestAuth(),
      onClose: this._stateCleanup
    })
  }

  _digestAuth () {
    const password = this.ctx.password
    return (app) => {
      const passport = require('@fastify/passport')
      const fastifySecureSession = require('@fastify/secure-session')
      const { DigestStrategy } = require('passport-http')
      app.register(fastifySecureSession, {
        secret: 'averylongphrasebiggerthanthirtytwochars',
        salt: 'mq9hDxBVDbspDR6n',
        cookie: { path: '/', httpOnly: true }
      })
      app.register(passport.initialize())
      passport.use(new DigestStrategy({ qop: 'auth', realm: 'antMiner Configuration' },
        (username, done) => done(null, username, password)))
      app.addHook('onRequest', passport.authenticate('digest', { session: false }))
    }
  }
}

module.exports = AntminerMock.expose(module)
