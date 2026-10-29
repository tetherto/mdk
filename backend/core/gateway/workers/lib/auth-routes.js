'use strict'

// Sign-in at the Gateway, through the Kernel's token issuer:
//
//   POST /auth/login    { username, password }  → access token; refresh token in a cookie
//   POST /auth/token    { assertion }           → a service account's tokens, both in the body
//   POST /auth/refresh  (cookie, or { refreshToken }) → new access token; the refresh token rotates
//   POST /auth/logout   (cookie, or { refreshToken }) → the session ends; the cookie is cleared
//   GET  /auth/me       (bearer)                → the identity the token carries
//
// A browser keeps the access token in memory and never sees the refresh token:
// it lives in an httpOnly, SameSite=Strict cookie scoped to /auth. A client
// without cookies (the CLI, scripts) sends `refreshIn: "body"` at login and
// gets the refresh token in the body instead, then sends it back in the body.

const COOKIE = 'mdk_refresh'

// Issuer refusals as HTTP: who you are is unknown (401), wait (429), or the request is malformed (400).
const STATUS = {
  ERR_IDENTITY_INVALID_CREDENTIALS: 401,
  ERR_IDENTITY_ASSERTION_INVALID: 401,
  ERR_IDENTITY_LOGIN_THROTTLED: 429,
  ERR_IDENTITY_REFRESH_INVALID: 401,
  ERR_IDENTITY_REFRESH_REUSED: 401,
  ERR_IDENTITY_REFRESH_REVOKED: 401,
  ERR_IDENTITY_REFRESH_EXPIRED: 401,
  ERR_IDENTITY_REFRESH_BINDING: 401
}

function _cookie (req, name) {
  const header = req.headers.cookie
  if (typeof header !== 'string') return null
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

// Secure everywhere but plain-HTTP loopback (a local dev server): over plain
// HTTP on a network the browser then keeps no refresh cookie at all, rather than
// one an eavesdropper can read. Behind a TLS proxy, set trustProxy so
// req.protocol is https.
function _secure (req) {
  if (req.protocol === 'https') return true
  const host = String(req.hostname || '').replace(/:\d+$/, '').toLowerCase()
  return !LOOPBACK.has(host)
}

function _setCookie (req, rep, value, maxAgeSec) {
  const secure = _secure(req) ? '; Secure' : ''
  rep.header('set-cookie', `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=${maxAgeSec}${secure}`)
}

function _issuerError (err) {
  const code = err.code || String(err.message).split(':')[0]
  const out = new Error(/^ERR_/.test(err.message) ? err.message : 'ERR_AUTH_UNAVAILABLE')
  out.statusCode = STATUS[code] || (/^ERR_IDENTITY_/.test(code) ? 400 : 503)
  return out
}

function _tokens (req, rep, tokens, inBody) {
  const out = { tokenType: tokens.tokenType, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn }
  if (inBody) return { ...out, refreshToken: tokens.refreshToken, refreshExpiresIn: tokens.refreshExpiresIn }
  _setCookie(req, rep, tokens.refreshToken, tokens.refreshExpiresIn)
  return out
}

const OBJECT_BODY = { type: 'object' }

/**
 * @param {object} authority - see authority.js
 * @returns {object[]} Fastify route definitions
 */
function createAuthRoutes (authority) {
  return [
    {
      method: 'POST',
      url: '/auth/login',
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: { username: { type: 'string', maxLength: 128 }, password: { type: 'string', maxLength: 1024 }, refreshIn: { enum: ['cookie', 'body'] } }
        }
      },
      handler: async (req, rep) => {
        const { username, password, refreshIn } = req.body
        let tokens
        try {
          tokens = await authority.login({ username, password })
        } catch (err) {
          req.log.info({ authz: { route: 'auth.login', sub: username, decision: 'deny', reason: err.code || err.message } }, 'authz')
          throw _issuerError(err)
        }
        req.log.info({ authz: { route: 'auth.login', sub: username, decision: 'allow' } }, 'authz')
        return _tokens(req, rep, tokens, refreshIn === 'body')
      }
    },
    {
      // An AI agent (or any service account) signs in with an assertion signed by
      // its own key (createAssertion in @tetherto/mdk-identity). It holds its own
      // refresh token, so both come back in the body.
      method: 'POST',
      url: '/auth/token',
      schema: { body: { type: 'object', required: ['assertion'], properties: { assertion: { type: 'string', maxLength: 8192 } } } },
      handler: async (req, rep) => {
        let tokens
        try {
          tokens = await authority.token({ assertion: req.body.assertion })
        } catch (err) {
          req.log.info({ authz: { route: 'auth.token', decision: 'deny', reason: err.code || err.message } }, 'authz')
          throw _issuerError(err)
        }
        req.log.info({ authz: { route: 'auth.token', decision: 'allow' } }, 'authz')
        return _tokens(req, rep, tokens, true)
      }
    },
    {
      method: 'POST',
      url: '/auth/refresh',
      schema: { body: { ...OBJECT_BODY, properties: { refreshToken: { type: 'string', maxLength: 256 } } } },
      handler: async (req, rep) => {
        const fromBody = req.body && req.body.refreshToken
        const refreshToken = fromBody || _cookie(req, COOKIE)
        if (!refreshToken) {
          const err = new Error('ERR_AUTH_UNAUTHORIZED')
          err.statusCode = 401
          throw err
        }
        try {
          return _tokens(req, rep, await authority.refresh({ refreshToken }), !!fromBody)
        } catch (err) {
          if (!fromBody) _setCookie(req, rep, '', 0)
          throw _issuerError(err)
        }
      }
    },
    {
      method: 'POST',
      url: '/auth/logout',
      schema: { body: { ...OBJECT_BODY, properties: { refreshToken: { type: 'string', maxLength: 256 } } } },
      handler: async (req, rep) => {
        const refreshToken = (req.body && req.body.refreshToken) || _cookie(req, COOKIE)
        _setCookie(req, rep, '', 0)
        if (!refreshToken) return { revoked: false }
        try {
          return await authority.logout({ refreshToken })
        } catch (err) {
          throw _issuerError(err)
        }
      }
    },
    {
      method: 'GET',
      url: '/auth/me',
      handler: async (req) => {
        const m = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.authorization || '')
        try {
          if (!m) throw new Error('no token')
          return await authority.verify(m[1])
        } catch {
          const err = new Error('ERR_AUTH_UNAUTHORIZED')
          err.statusCode = 401
          throw err
        }
      }
    }
  ]
}

module.exports = { createAuthRoutes, REFRESH_COOKIE: COOKIE }
