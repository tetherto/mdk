'use strict'

const crypto = require('crypto')
const { signJwt, decodeJwt } = require('./jwt')

// The service-account side of sign-in: an app runtime or agent signs a short
// assertion with its own key and trades it for tokens, then keeps a valid
// access token at hand, refreshing before it expires.

function _privateKey (key) {
  return typeof key === 'string' || Buffer.isBuffer(key) ? crypto.createPrivateKey(key) : key
}

/**
 * @param {object} opts
 * @param {string} opts.name - the service account (`app:<name>` or an agent name)
 * @param {string|Buffer|crypto.KeyObject} opts.privateKey - its Ed25519 private key (PEM)
 * @param {string} [opts.audience='mdk'] - the issuer's name
 * @param {number} [opts.ttlSec=60]
 * @param {() => number} [opts.now]
 * @returns {string} a signed, single-use assertion
 */
function createAssertion ({ name, privateKey, audience = 'mdk', ttlSec = 60, now = Date.now }) {
  const iat = Math.floor(now() / 1000)
  return signJwt({ iss: name, sub: name, aud: audience, iat, exp: iat + ttlSec, jti: crypto.randomBytes(16).toString('base64url') }, _privateKey(privateKey))
}

class ServiceAccountTokenSource {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {string|Buffer|crypto.KeyObject} opts.privateKey
   * @param {(action: string, payload: object) => Promise<object>} opts.request
   *   - sends `auth.token` / `auth.refresh` to the Kernel and resolves its reply
   * @param {string} [opts.audience='mdk']
   * @param {number} [opts.refreshSkewSec=60] - renew this long before expiry
   * @param {() => number} [opts.now]
   */
  constructor ({ name, privateKey, request, audience = 'mdk', refreshSkewSec = 60, now = Date.now }) {
    if (typeof request !== 'function') throw new Error('ERR_IDENTITY_REQUEST_REQUIRED')
    this.name = name
    this.privateKey = _privateKey(privateKey)
    this.request = request
    this.audience = audience
    this.refreshSkewSec = refreshSkewSec
    this.now = now
    this._tokens = null
    this._exp = 0
    this._pending = null
  }

  async _call (action, payload) {
    const reply = await this.request(action, payload)
    if (!reply || reply.error) {
      const err = new Error(reply && reply.error ? reply.error : `ERR_IDENTITY_NO_REPLY: ${action}`)
      err.code = String(err.message).split(':')[0]
      throw err
    }
    return reply
  }

  async _fetch () {
    if (this._tokens && this._tokens.refreshToken) {
      try {
        return await this._call('auth.refresh', { refreshToken: this._tokens.refreshToken })
      } catch {
        // A revoked or expired session: sign in again with a fresh assertion.
      }
    }
    return this._call('auth.token', { assertion: createAssertion({ name: this.name, privateKey: this.privateKey, audience: this.audience, now: this.now }) })
  }

  /** A valid access token, renewed when it is close to expiry. Concurrent callers share one renewal. */
  async getToken () {
    if (this._tokens && this.now() < this._exp) return this._tokens.accessToken
    if (!this._pending) {
      this._pending = this._fetch().then((tokens) => {
        this._tokens = tokens
        const { exp } = decodeJwt(tokens.accessToken).claims
        this._exp = (exp - this.refreshSkewSec) * 1000
        return tokens.accessToken
      }).finally(() => { this._pending = null })
    }
    return this._pending
  }

  /** Forget the tokens held, so the next getToken() signs in again. */
  reset () {
    this._tokens = null
    this._exp = 0
  }
}

module.exports = { createAssertion, ServiceAccountTokenSource }
