'use strict'

const crypto = require('crypto')
const MinerpoolMock = require('../../../mock/minerpool.mock')
const { TEST_ACCESS_KEY, TEST_PUBLIC_KEY } = require('./lib/test-keys')

class SpiderpoolMock extends MinerpoolMock {
  static dir = __dirname
  static defaultPort = 8000
  static extraCliOptions = {
    usernames: { type: 'string', description: 'comma-separated pool subaccounts' }
  }

  constructor (ctx = {}) {
    super(ctx)
    const u = this.ctx.usernames
    this.ctx.usernames = Array.isArray(u) ? u : (typeof u === 'string' ? u.split(',') : ['spider-test'])
  }

  routes () {
    return require('./routers/base')
  }

  auth () {
    // Verifies the real SpiderPool request envelope: accessKey plus a base64
    // MD5withRSA signature of `${dataJson}|${timestamp}` (checked against the
    // bundled test public key). /mock/* control endpoints stay unauthenticated.
    return (app) => {
      app.addHook('preHandler', (req, res, next) => {
        if (req.url.startsWith('/mock/')) return next()
        const { dataJson, accessKey, timestamp, sign } = req.body || {}
        if (!accessKey || accessKey !== TEST_ACCESS_KEY) {
          return res.send({ code: 'AUTH_FAILED', msg: 'invalid or missing accessKey', data: null })
        }
        let verified = false
        try {
          const verifier = crypto.createVerify('MD5')
          verifier.update(`${dataJson}|${timestamp}`, 'utf8')
          verified = verifier.verify(TEST_PUBLIC_KEY, sign, 'base64')
        } catch (e) {
          verified = false
        }
        if (!verified) {
          return res.send({ code: 'SIGN_INVALID', msg: 'signature verification failed', data: null })
        }
        next()
      })
    }
  }
}

module.exports = SpiderpoolMock.expose(module)
