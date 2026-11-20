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
// without cookies (a script) sends `refreshIn: "body"` at login and
// gets the refresh token in the body instead, then sends it back in the body.

const { GATEWAY_ERROR_SCHEMA } = require('./shared-responses')

const COOKIE = 'mdk_refresh'

// Issuer refusals as HTTP: who you are is unknown (401), wait (429), the issuer
// cannot sign yet (503: it is still loading its key, so the same request succeeds
// later), or the request is malformed (400).
const STATUS = {
  ERR_IDENTITY_NOT_READY: 503,
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
    if (i > 0 && part.slice(0, i).trim() === name) {
      // A value that does not percent-decode is no token, as a missing one is.
      try {
        return decodeURIComponent(part.slice(i + 1).trim())
      } catch {
        return null
      }
    }
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
  return !LOOPBACK.has(_host(req.hostname))
}

// The hostname without a port. A bracketed IPv6 host ([::1]:3000) ends at its
// `]`; a bare one (::1) has more than one colon and no port to strip, so only
// a name or IPv4 address with a single colon (localhost:3000) loses its port.
// An unclosed bracket ([::1) has no host and gives the empty string.
function _host (hostname) {
  const h = String(hostname || '').toLowerCase()
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1)
  return h.indexOf(':') === h.lastIndexOf(':') ? h.replace(/:\d+$/, '') : h
}

function _setCookie (req, rep, value, maxAgeSec) {
  const secure = _secure(req) ? '; Secure' : ''
  rep.header('set-cookie', `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=${maxAgeSec}${secure}`)
}

// An issuer code as HTTP: the STATUS map, else a request the issuer refused
// (ERR_IDENTITY_*, 400), else the issuer failing (503). The route declarations
// below read the same function, so a declared status is the one sent.
function _statusOf (code) {
  return STATUS[code] || (/^ERR_IDENTITY_/.test(code) ? 400 : 503)
}

function _issuerError (err) {
  const code = err.code || String(err.message).split(':')[0]
  const out = new Error(/^ERR_/.test(err.message) ? err.message : 'ERR_AUTH_UNAVAILABLE')
  out.statusCode = _statusOf(code)
  return out
}

function _tokens (req, rep, tokens, inBody) {
  const out = { tokenType: tokens.tokenType, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn }
  if (inBody) return { ...out, refreshToken: tokens.refreshToken, refreshExpiresIn: tokens.refreshExpiresIn }
  _setCookie(req, rep, tokens.refreshToken, tokens.refreshExpiresIn)
  return out
}

const OBJECT_BODY = { type: 'object' }

// summary, description, tags, responses, security and (OpenAPI) parameters are
// what the Gateway's generated HTTP reference reads (docs/scripts/generate-api-reference.mjs); Fastify treats them
// as metadata. `responses` (plural) is OpenAPI's field, not Fastify's
// `response`: no route declares `response`, since Fastify would serialize
// replies through it and drop any field it does not list.
const TAGS = ['Gateway authentication']

// The body of every error the Gateway answers, as errorResponse in
// plugin-adapter.js builds it. It is defined in shared-responses.js, beside the
// responses every app route shares, so every generated document carries the
// same one. The generated OpenAPI document carries it once, under components,
// and each error response refers to it.
const ERROR_SCHEMA_REF = '#/components/schemas/GatewayError'
const COMPONENTS = {
  securitySchemes: {
    bearer: { type: 'http', scheme: 'bearer', description: 'An access token from `/auth/login`, `/auth/token` or `/auth/refresh`.' }
  },
  schemas: {
    GatewayError: GATEWAY_ERROR_SCHEMA
  }
}

const STRING = { type: 'string' }

// The refresh cookie as an OpenAPI parameter, for the routes that read it when
// the body carries no refreshToken. Metadata only: Fastify has no cookie schema.
const REFRESH_COOKIE = {
  in: 'cookie',
  name: COOKIE,
  required: false,
  description: 'The refresh token, read when the body carries no `refreshToken`; the body takes precedence.',
  schema: STRING
}
const SECONDS = { type: 'integer', description: 'Lifetime in seconds.' }
const ACCESS = {
  tokenType: { const: 'Bearer' },
  accessToken: { ...STRING, description: 'Send as `Authorization: Bearer <accessToken>`.' },
  expiresIn: SECONDS
}
const REFRESH = {
  refreshToken: { ...STRING, description: 'Send to `/auth/refresh` or `/auth/logout`.' },
  refreshExpiresIn: SECONDS
}
const TOKENS_IN_COOKIE = { type: 'object', required: Object.keys(ACCESS), properties: ACCESS, additionalProperties: false }
const TOKENS_IN_BODY = { type: 'object', required: [...Object.keys(ACCESS), ...Object.keys(REFRESH)], properties: { ...ACCESS, ...REFRESH }, additionalProperties: false }
const SET_COOKIE = (description) => ({ 'Set-Cookie': { description, schema: STRING } })
const json = (schema) => ({ 'application/json': { schema } })

// What a route answers when it succeeds.
function _ok (description, schema, headers) {
  return { description, content: json(schema), ...(headers ? { headers } : {}) }
}

// The issuer's own failures, on every route that calls it: an error with no
// ERR_* code (ERR_AUTH_UNAVAILABLE), or an ERR_* code it is not an identity
// code (passed on as sent), both through _statusOf.
const ISSUER_DOWN = ['ERR_AUTH_UNAVAILABLE', 'The token issuer is unreachable or failed. A remote Kernel\'s own non-identity `ERR_*` code is passed on with the same status.']
const NOT_READY = ['ERR_IDENTITY_NOT_READY', 'The token issuer is still starting and has no signing key yet. Retry once it is ready; a refresh from the cookie has cleared the cookie, so a browser signs in again.']
const BODY_INVALID = 'The body fails the route\'s schema; `message` is the validation error.'

/**
 * OpenAPI responses for a route: the success response, then one response per
 * error status. `errors` is [[code, when, status?]]: status defaults to what
 * _statusOf sends for the code, which is the status the handler's _issuerError
 * answers with. A code that resolves to no status throws here, at load.
 */
// What a caller does about each code, for the generated Errors table.
const FIX = {
  ERR_AUTH_UNAUTHORIZED: 'Send the token the route reads: a bearer access token, or a refresh token for `/auth/refresh`.',
  ERR_AUTH_UNAVAILABLE: 'Retry once the Kernel and its token issuer are reachable.',
  ERR_IDENTITY_INVALID_CREDENTIALS: 'Check the username and password, and that the user is enabled.',
  ERR_IDENTITY_LOGIN_THROTTLED: 'Wait the interval in the message, then retry.',
  ERR_IDENTITY_ASSERTION_INVALID: 'Sign a fresh assertion with the service account\'s registered key.',
  ERR_IDENTITY_NOT_READY: 'Retry once the issuer is ready.',
  ERR_IDENTITY_REFRESH_INVALID: 'Sign in again.',
  ERR_IDENTITY_REFRESH_REVOKED: 'Sign in again.',
  ERR_IDENTITY_REFRESH_REUSED: 'Sign in again, and treat the refresh token as leaked.',
  ERR_IDENTITY_REFRESH_EXPIRED: 'Sign in again.',
  ERR_IDENTITY_REFRESH_BINDING: 'Refresh from the HRPC caller that signed in.'
}

function _responses (ok, errors, { bodyValidated = false } = {}) {
  const byStatus = new Map()
  for (const [code, when, status = _statusOf(code)] of errors) {
    if (!Number.isInteger(status)) throw new Error(`ERR_AUTH_ROUTE_STATUS_UNKNOWN: ${code}`)
    if (!byStatus.has(status)) byStatus.set(status, [])
    byStatus.get(status).push({ code, description: when, ...(FIX[code] ? { fix: FIX[code] } : {}) })
  }
  if (bodyValidated && !byStatus.has(400)) byStatus.set(400, [])
  const out = { 200: ok }
  for (const status of [...byStatus.keys()].sort((a, b) => a - b)) {
    const codes = byStatus.get(status)
    const parts = codes.map(c => `\`${c.code}\`: ${c.description.replace(/\.$/, '')}`)
    if (status === 400 && bodyValidated) parts.push(BODY_INVALID.replace(/\.$/, ''))
    out[status] = {
      description: `${parts.join('. ')}.`,
      content: json({ $ref: ERROR_SCHEMA_REF }),
      ...(codes.length ? { 'x-mdk-errors': codes } : {})
    }
  }
  return out
}

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
        summary: 'Sign in with a username and password',
        description: 'Checks the credentials with the Kernel\'s token issuer. The refresh token is set as an `HttpOnly`, `SameSite=Strict` cookie scoped to `/auth`; send `"refreshIn": "body"` to get it in the body instead.',
        tags: TAGS,
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: { username: { type: 'string', maxLength: 128 }, password: { type: 'string', maxLength: 1024 }, refreshIn: { enum: ['cookie', 'body'] } }
        },
        responses: _responses(
          _ok('Signed in. The refresh token is in the cookie, or in the body with `"refreshIn": "body"`.', { oneOf: [TOKENS_IN_COOKIE, TOKENS_IN_BODY] }, SET_COOKIE('The refresh token, unless `"refreshIn": "body"` was sent.')),
          [
            ['ERR_IDENTITY_INVALID_CREDENTIALS', 'The username or password is wrong, or the user is disabled or has no password.'],
            ['ERR_IDENTITY_LOGIN_THROTTLED', 'Too many failed sign-ins for this username; the detail says how long to wait.'],
            NOT_READY,
            ISSUER_DOWN
          ],
          { bodyValidated: true }
        )
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
      schema: {
        summary: 'Sign in a service account with a signed assertion',
        description: 'For an AI agent or another service account: send an assertion signed with its own key (`createAssertion` in `@tetherto/mdk-identity`). Both tokens come back in the body.',
        tags: TAGS,
        body: { type: 'object', required: ['assertion'], properties: { assertion: { type: 'string', maxLength: 8192 } } },
        responses: _responses(
          _ok('Signed in, with both tokens in the body.', TOKENS_IN_BODY),
          [
            ['ERR_IDENTITY_ASSERTION_INVALID', 'The assertion is malformed, expired, too long-lived, for another audience, already used, or not signed by a known service account; the detail says which.'],
            NOT_READY,
            ISSUER_DOWN
          ],
          { bodyValidated: true }
        )
      },
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
      schema: {
        summary: 'Get a new access token',
        description: 'Takes the refresh token from the body (`refreshToken`) or, without one, from the refresh cookie; send `{}` with the cookie, since a JSON body is required. Answers new tokens the way the old one arrived, and rotates the refresh token on every use. When a cookie refresh is refused or the issuer fails, the cookie is cleared and a browser signs in again.',
        tags: TAGS,
        body: { ...OBJECT_BODY, properties: { refreshToken: { type: 'string', maxLength: 256 } } },
        parameters: [REFRESH_COOKIE],
        responses: _responses(
          _ok('New tokens, the way the old refresh token arrived.', { oneOf: [TOKENS_IN_COOKIE, TOKENS_IN_BODY] }, SET_COOKIE('The rotated refresh token, when the old one came from the cookie; cleared when the issuer refuses that refresh or fails.')),
          [
            ['ERR_AUTH_UNAUTHORIZED', 'No refresh token in the body or the cookie.', 401],
            ['ERR_IDENTITY_REFRESH_INVALID', 'The refresh token is not one the issuer holds.'],
            ['ERR_IDENTITY_REFRESH_REVOKED', 'The session was signed out or revoked.'],
            ['ERR_IDENTITY_REFRESH_REUSED', 'A used refresh token was sent again outside the issuer\'s reuse grace window, so the whole session is revoked. Inside the window, while its successor is unused, a reuse gets that same successor instead.'],
            ['ERR_IDENTITY_REFRESH_EXPIRED', 'The refresh token or its session has expired.'],
            ['ERR_IDENTITY_REFRESH_BINDING', 'The session is bound to the HRPC caller that signed in (a service account\'s assertion sign-in, unless it sent `bind: false`), so refresh it from that caller.'],
            NOT_READY,
            ISSUER_DOWN
          ],
          { bodyValidated: true }
        )
      },
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
      schema: {
        summary: 'Sign out',
        description: 'Clears the refresh cookie and ends the session of the refresh token sent in the body (`refreshToken`) or, without one, in the cookie; a JSON body is required either way, so send `{}` with the cookie. Signing out a token that is missing, unknown or already revoked is not an error.',
        tags: TAGS,
        body: { ...OBJECT_BODY, properties: { refreshToken: { type: 'string', maxLength: 256 } } },
        parameters: [REFRESH_COOKIE],
        responses: _responses(
          _ok(
            'Signed out.',
            { type: 'object', required: ['revoked'], properties: { revoked: { type: 'boolean', description: '`false` when no token was sent or the issuer holds no live session for it.' } }, additionalProperties: false },
            SET_COOKIE('Clears the refresh cookie on every request that passes validation.')
          ),
          [ISSUER_DOWN],
          { bodyValidated: true }
        )
      },
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
      schema: {
        summary: 'Read the signed-in identity',
        description: 'Verifies the bearer token in the `Authorization` header and answers the identity it carries.',
        tags: TAGS,
        security: [{ bearer: [] }],
        responses: _responses(
          _ok('The identity the token carries.', {
            type: 'object',
            required: ['kind', 'sub'],
            properties: {
              kind: { type: 'string', description: 'What signed in: a user or a service account.' },
              sub: { type: 'string', description: 'The user or service account name.' },
              email: STRING,
              groups: { type: 'array', items: STRING }
            },
            additionalProperties: false
          }),
          [['ERR_AUTH_UNAUTHORIZED', 'No bearer token, or one that is invalid, expired or revoked.', 401]]
        )
      },
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

module.exports = { createAuthRoutes, REFRESH_COOKIE: COOKIE, AUTH_COMPONENTS: COMPONENTS }
