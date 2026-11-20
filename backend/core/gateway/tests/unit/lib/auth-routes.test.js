'use strict'

const test = require('brittle')
const { createAuthRoutes } = require('../../../workers/lib/auth-routes')
const { errorResponse } = require('../../../workers/lib/plugin-adapter')

const TOKENS = { accessToken: 'a.b.c', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 3600 }

function route (url, authority) {
  return createAuthRoutes(authority).find((r) => r.url === url)
}

// A Fastify request/reply pair, as far as the handlers use them.
function call (url, authority, req = {}) {
  const headers = {}
  const rep = { header: (k, v) => { headers[k] = v } }
  const request = { protocol: 'http', hostname: 'localhost', headers: {}, body: {}, log: { info () {} }, ...req }
  return route(url, authority).handler(request, rep).then(
    (value) => ({ value, headers }),
    (error) => ({ error, headers })
  )
}

const login = { login: async () => TOKENS }

test('auth routes - the refresh cookie is Secure except over plain-HTTP loopback', async (t) => {
  const cookie = async (req) => (await call('/auth/login', login, { body: { username: 'u', password: 'p' }, ...req })).headers['set-cookie']
  t.absent(/; Secure/.test(await cookie({ hostname: 'localhost' })), 'local dev server')
  t.absent(/; Secure/.test(await cookie({ hostname: '127.0.0.1' })))
  t.ok(/; Secure/.test(await cookie({ hostname: 'mdk.example.com' })), 'plain HTTP on a network: the browser keeps no cookie')
  t.ok(/; Secure/.test(await cookie({ protocol: 'https', hostname: 'mdk.example.com' })))
  t.ok(/HttpOnly; SameSite=Strict; Path=\/auth/.test(await cookie({})))
})

test('auth routes - a refused refresh clears the cookie', async (t) => {
  const failing = (code) => ({ refresh: async () => { throw Object.assign(new Error(`${code}: x`), { code }) } })
  const reused = await call('/auth/refresh', failing('ERR_IDENTITY_REFRESH_REUSED'), { headers: { cookie: 'mdk_refresh=old' } })
  t.is(reused.error.statusCode, 401)
  t.ok(/Max-Age=0/.test(reused.headers['set-cookie']))
})

// The routes document themselves: the Gateway's HTTP reference is generated
// from these objects (docs/scripts/generate-api-reference.mjs), so each carries
// a summary, a description, a tag and its responses. Fastify treats those keys
// as metadata.
test('auth routes - each route describes itself for the generated reference', (t) => {
  for (const r of createAuthRoutes({})) {
    t.is(typeof r.schema?.summary, 'string', `${r.url} summary`)
    t.ok(r.schema.summary.length > 0)
    t.is(typeof r.schema.description, 'string', `${r.url} description`)
    t.ok(r.schema.description.length > 0)
    t.alike(r.schema.tags, ['Gateway authentication'], `${r.url} tags`)
    t.ok(r.schema.responses?.[200], `${r.url} declares its success response`)
    // Fastify's `response` (singular) drives its serializer and drops undeclared fields.
    t.absent('response' in r.schema, `${r.url} declares no Fastify response schema`)
  }
})

test('auth routes - the descriptive metadata leaves registration unchanged', async (t) => {
  const fastify = require('fastify')()
  t.teardown(() => fastify.close())
  for (const r of createAuthRoutes({ verify: async () => ({ kind: 'user', sub: 'u' }) })) fastify.route(r)
  await fastify.ready()
  const me = await fastify.inject({ method: 'GET', url: '/auth/me', headers: { authorization: 'Bearer t' } })
  t.is(me.statusCode, 200)
  t.alike(me.json(), { kind: 'user', sub: 'u' })
  const bad = await fastify.inject({ method: 'POST', url: '/auth/login', payload: { username: 'u' } })
  t.is(bad.statusCode, 400, 'body schema still enforced')
})

// The declaration drives the test: every code a route's responses name is
// raised, and the status it arrives with must be the status it is declared
// under. With the success and body-schema cases, every declared status is
// produced by a request here.
const AUTHORITY_METHOD = { '/auth/login': 'login', '/auth/token': 'token', '/auth/refresh': 'refresh', '/auth/logout': 'logout', '/auth/me': 'verify' }
const GOOD_REQUEST = {
  '/auth/login': { payload: { username: 'u', password: 'p' } },
  '/auth/token': { payload: { assertion: 'a' } },
  '/auth/refresh': { payload: { refreshToken: 'r' } },
  '/auth/logout': { payload: { refreshToken: 'r' } },
  '/auth/me': { headers: { authorization: 'Bearer t' } }
}
// A request each body-validating route's schema refuses. Not a wrong type for
// a string field: Fastify coerces a number to a string, so it passes.
const BAD_BODY = {
  '/auth/login': { username: 'u' },
  '/auth/token': {},
  '/auth/refresh': { refreshToken: 'x'.repeat(257) },
  '/auth/logout': { refreshToken: 'x'.repeat(257) }
}
const OK_AUTHORITY = {
  login: async () => ({ tokenType: 'Bearer', ...TOKENS }),
  token: async () => ({ tokenType: 'Bearer', ...TOKENS }),
  refresh: async () => ({ tokenType: 'Bearer', ...TOKENS }),
  logout: async () => ({ revoked: true }),
  verify: async () => ({ kind: 'user', sub: 'u' })
}

async function gateway (authority) {
  const fastify = require('fastify')()
  for (const r of createAuthRoutes(authority)) fastify.route(r)
  fastify.setErrorHandler((err, req, reply) => {
    const body = errorResponse(err, req.log)
    reply.status(body.statusCode).send(body)
  })
  await fastify.ready()
  return fastify
}

// The request that raises `code` on `url`: the Gateway's own ERR_AUTH_UNAUTHORIZED
// comes from a missing token, ERR_AUTH_UNAVAILABLE from an issuer error with no
// code, and every other code from the issuer throwing it.
function raising (url, code) {
  if (code === 'ERR_AUTH_UNAUTHORIZED') return { authority: OK_AUTHORITY, request: url === '/auth/me' ? {} : { payload: {} } }
  const err = code === 'ERR_AUTH_UNAVAILABLE' ? new Error('issuer down') : Object.assign(new Error(`${code}: detail`), { code })
  return { authority: { ...OK_AUTHORITY, [AUTHORITY_METHOD[url]]: async () => { throw err } }, request: GOOD_REQUEST[url] }
}

test('auth routes - every declared error code arrives with its declared status', async (t) => {
  for (const r of createAuthRoutes({})) {
    for (const [status, response] of Object.entries(r.schema.responses)) {
      for (const { code } of response['x-mdk-errors'] || []) {
        const { authority, request } = raising(r.url, code)
        const fastify = await gateway(authority)
        const res = await fastify.inject({ method: r.method, url: r.url, ...request })
        await fastify.close()
        t.is(res.statusCode, Number(status), `${r.method} ${r.url} ${code}`)
        t.ok(res.json().message.startsWith(code), `${r.method} ${r.url} ${code} message`)
      }
    }
  }
})

test('auth routes - every declared status is produced, and none undeclared is', async (t) => {
  for (const r of createAuthRoutes({})) {
    const produced = new Set()
    const ok = await gateway(OK_AUTHORITY)
    produced.add((await ok.inject({ method: r.method, url: r.url, ...GOOD_REQUEST[r.url] })).statusCode)
    if (BAD_BODY[r.url]) produced.add((await ok.inject({ method: r.method, url: r.url, payload: BAD_BODY[r.url] })).statusCode)
    await ok.close()
    for (const response of Object.values(r.schema.responses)) {
      for (const { code } of response['x-mdk-errors'] || []) {
        const { authority, request } = raising(r.url, code)
        const fastify = await gateway(authority)
        produced.add((await fastify.inject({ method: r.method, url: r.url, ...request })).statusCode)
        await fastify.close()
      }
    }
    t.alike([...produced].sort(), Object.keys(r.schema.responses).map(Number).sort(), `${r.method} ${r.url}`)
  }
})

// The inputs a route declares beside its body are the ones it reads: a route
// declaring the bearer scheme refuses a request without one, a route declaring
// the refresh cookie works from the cookie alone, and no other route needs either.
test('auth routes - the declared bearer token and refresh cookie are the inputs each route reads', async (t) => {
  const seen = []
  const authority = {
    ...OK_AUTHORITY,
    refresh: async ({ refreshToken }) => { seen.push(['refresh', refreshToken]); return OK_AUTHORITY.refresh() },
    logout: async ({ refreshToken }) => { seen.push(['logout', refreshToken]); return OK_AUTHORITY.logout() }
  }
  const fastify = await gateway(authority)
  for (const r of createAuthRoutes({})) {
    const bearer = (r.schema.security || []).some(req => 'bearer' in req)
    const cookie = (r.schema.parameters || []).some(p => p.in === 'cookie' && p.name === 'mdk_refresh')
    const body = GOOD_REQUEST[r.url].payload
    if (bearer) {
      t.is((await fastify.inject({ method: r.method, url: r.url })).statusCode, 401, `${r.url} refuses a request with no bearer token`)
      t.is((await fastify.inject({ method: r.method, url: r.url, headers: { authorization: 'Bearer t' } })).statusCode, 200, `${r.url} with one`)
    } else {
      t.is((await fastify.inject({ method: r.method, url: r.url, payload: body })).statusCode, 200, `${r.url} needs no bearer token`)
    }
    if (cookie) {
      const res = await fastify.inject({ method: r.method, url: r.url, payload: {}, headers: { cookie: 'mdk_refresh=from-cookie' } })
      t.is(res.statusCode, 200, `${r.url} works from the cookie alone`)
      t.alike(seen.pop(), [AUTHORITY_METHOD[r.url], 'from-cookie'], `${r.url} read the cookie`)
      const calls = seen.length
      const bare = await fastify.inject({ method: r.method, url: r.url, headers: { cookie: 'mdk_refresh=from-cookie' } })
      t.is(bare.statusCode, 400, `${r.url} needs a JSON body even with the cookie alone`)
      t.is(seen.length, calls, `${r.url} refuses it before the handler`)
    }
  }
  await fastify.close()
})

// The generated Errors table reads each code's reason and fix from these declarations.
test('auth routes - every declared error code has a reason and a fix', (t) => {
  for (const r of createAuthRoutes({})) {
    for (const [status, response] of Object.entries(r.schema.responses || {})) {
      for (const e of response['x-mdk-errors'] || []) {
        t.ok(e.description, `${r.url} ${status} ${e.code} has a reason`)
        t.ok(e.fix, `${r.url} ${status} ${e.code} has a fix`)
      }
    }
  }
})

// The cookie is read by name among others; a missing or merely similar name is no cookie.
test('auth routes - the refresh cookie is matched by its exact name', async (t) => {
  const seen = []
  const fastify = await gateway({ ...OK_AUTHORITY, refresh: async ({ refreshToken }) => { seen.push(refreshToken); return OK_AUTHORITY.refresh() } })
  t.teardown(() => fastify.close())
  const refresh = (cookie) => fastify.inject({ method: 'POST', url: '/auth/refresh', payload: {}, headers: { cookie } })
  const none = await refresh('other=1')
  t.alike([none.statusCode, none.json().message], [401, 'ERR_AUTH_UNAUTHORIZED'], 'another cookie only')
  const similar = await refresh('xmdk_refresh=v; mdk_refreshx=w')
  t.is(similar.statusCode, 401, 'a name that only contains mdk_refresh')
  t.is(seen.length, 0, 'the issuer is not called')
  t.is((await refresh(' mdk_refresh = spaced ')).statusCode, 200)
  t.alike(seen, ['spaced'], 'the name and value are trimmed')
})

// A value that does not percent-decode is no token, as a missing one is.
test('auth routes - a refresh cookie that does not decode is no cookie', async (t) => {
  let called = false
  const errors = []
  const fastify = await gateway({ ...OK_AUTHORITY, refresh: async () => { called = true }, logout: async () => { called = true } })
  t.teardown(() => fastify.close())
  fastify.log.error = (e) => errors.push(e)
  const cookie = 'mdk_refresh=%E0%A4%A'
  const refresh = await fastify.inject({ method: 'POST', url: '/auth/refresh', payload: {}, headers: { cookie } })
  t.alike([refresh.statusCode, refresh.json().message], [401, 'ERR_AUTH_UNAUTHORIZED'], 'refresh: no token')
  const logout = await fastify.inject({ method: 'POST', url: '/auth/logout', payload: {}, headers: { cookie } })
  t.alike([logout.statusCode, logout.json()], [200, { revoked: false }], 'logout: nothing to revoke')
  t.ok(/^mdk_refresh=;.*Max-Age=0/.test(logout.headers['set-cookie']), 'logout clears the bad cookie')
  t.absent(called, 'the issuer is not called')
  const fromBody = await call('/auth/refresh', OK_AUTHORITY, { body: { refreshToken: 'r' }, headers: { cookie } })
  t.ok(fromBody.value?.refreshToken, 'a body token still works beside a bad cookie')
})

// The handler on its own, for hostnames Fastify does not produce today (a
// bare IPv6 address): its port strip must not eat the address.
test('auth routes - a bare IPv6 loopback hostname keeps its address', async (t) => {
  const cookie = async (hostname) => (await call('/auth/login', login, { body: { username: 'u', password: 'p' }, hostname })).headers['set-cookie']
  t.absent(/; Secure/.test(await cookie('::1')), '::1 is loopback')
  t.ok(/; Secure/.test(await cookie('::2')), '::2 is not')
  t.ok(/; Secure/.test(await cookie('[::1')), 'an unclosed bracket is not loopback')
  t.ok(/; Secure/.test(await cookie(undefined)), 'no hostname is not loopback')
})

// Through Fastify, so req.hostname is what a real Host header gives (IPv6 in
// brackets, the port dropped).
test('auth routes - the cookie is Secure off loopback, whatever the loopback spelling', async (t) => {
  const fastify = await gateway(OK_AUTHORITY)
  t.teardown(() => fastify.close())
  const cookie = async (host) => (await fastify.inject({ method: 'POST', url: '/auth/login', payload: { username: 'u', password: 'p' }, headers: { host } })).headers['set-cookie']
  for (const host of ['[::1]', '[::1]:3000', 'localhost:3000', '127.0.0.1:8080', 'LOCALHOST']) t.absent(/; Secure/.test(await cookie(host)), host)
  for (const host of ['10.0.0.5', '10.0.0.5:3000', 'localhost.example.com', '[::2]']) t.ok(/; Secure/.test(await cookie(host)), host)
})

test('auth routes - the cookie value is percent-encoded and carries the refresh lifetime', async (t) => {
  const { headers } = await call('/auth/login', { login: async () => ({ ...TOKENS, refreshToken: 'id.se=cr;et' }) }, { body: { username: 'u', password: 'p' } })
  t.ok(headers['set-cookie'].startsWith('mdk_refresh=id.se%3Dcr%3Bet;'))
  t.ok(headers['set-cookie'].includes(`Max-Age=${TOKENS.refreshExpiresIn}`))
})

test('auth routes - an issuer error without a code is read from its message', async (t) => {
  const throwing = (message) => ({ login: async () => { throw new Error(message) } })
  const reused = await call('/auth/login', throwing('ERR_IDENTITY_LOGIN_THROTTLED: retry in 30s'), { body: { username: 'u', password: 'p' } })
  t.alike([reused.error.statusCode, reused.error.message], [429, 'ERR_IDENTITY_LOGIN_THROTTLED: retry in 30s'])
  const unknown = await call('/auth/login', throwing('ERR_IDENTITY_SOMETHING_NEW: x'), { body: { username: 'u', password: 'p' } })
  t.is(unknown.error.statusCode, 400, 'an identity code with no mapping is a refused request')
})

// ISSUER_DOWN: a non-identity ERR_* code from a remote Kernel is passed on, as 503.
test('auth routes - a non-identity ERR_* code is passed on with 503', async (t) => {
  const err = Object.assign(new Error('ERR_MDK_CLIENT_UNAVAILABLE: kernel unreachable'), { code: 'ERR_MDK_CLIENT_UNAVAILABLE' })
  for (const r of createAuthRoutes({})) {
    if (r.url === '/auth/me') continue
    const fastify = await gateway({ ...OK_AUTHORITY, [AUTHORITY_METHOD[r.url]]: async () => { throw err } })
    const res = await fastify.inject({ method: r.method, url: r.url, ...GOOD_REQUEST[r.url] })
    await fastify.close()
    t.alike([res.statusCode, res.json().message], [503, err.message], r.url)
  }
})

test('auth routes - login puts the refresh token in the cookie, or in the body on request', async (t) => {
  const body = { username: 'u', password: 'p' }
  const cookie = await call('/auth/login', OK_AUTHORITY, { body })
  t.alike(cookie.value, { tokenType: 'Bearer', accessToken: TOKENS.accessToken, expiresIn: TOKENS.expiresIn }, 'no refresh token in the body by default')
  t.ok(cookie.headers['set-cookie'].startsWith('mdk_refresh=r;'))
  const explicit = await call('/auth/login', OK_AUTHORITY, { body: { ...body, refreshIn: 'cookie' } })
  t.absent('refreshToken' in explicit.value)
  t.ok(explicit.headers['set-cookie'])
  const inBody = await call('/auth/login', OK_AUTHORITY, { body: { ...body, refreshIn: 'body' } })
  t.alike(inBody.value, { tokenType: 'Bearer', ...TOKENS })
  t.absent(inBody.headers['set-cookie'], 'no cookie')
})

test('auth routes - a service account\'s tokens are both in the body, with no cookie', async (t) => {
  const res = await call('/auth/token', OK_AUTHORITY, { body: { assertion: 'a' } })
  t.alike(res.value, { tokenType: 'Bearer', ...TOKENS })
  t.absent(res.headers['set-cookie'])
})

test('auth routes - sign-ins log the decision', async (t) => {
  const logged = []
  const log = { info: (entry) => logged.push(entry.authz) }
  await call('/auth/login', OK_AUTHORITY, { body: { username: 'alice', password: 'p' }, log })
  const refused = { login: async () => { throw Object.assign(new Error('ERR_IDENTITY_INVALID_CREDENTIALS'), { code: 'ERR_IDENTITY_INVALID_CREDENTIALS' }) } }
  await call('/auth/login', refused, { body: { username: 'alice', password: 'p' }, log })
  await call('/auth/token', OK_AUTHORITY, { body: { assertion: 'a' }, log })
  await call('/auth/token', { token: async () => { throw new Error('down') } }, { body: { assertion: 'a' }, log })
  t.alike(logged, [
    { route: 'auth.login', sub: 'alice', decision: 'allow' },
    { route: 'auth.login', sub: 'alice', decision: 'deny', reason: 'ERR_IDENTITY_INVALID_CREDENTIALS' },
    { route: 'auth.token', decision: 'allow' },
    { route: 'auth.token', decision: 'deny', reason: 'down' }
  ])
  t.absent(JSON.stringify(logged).includes('"p"'), 'the password is not logged')
})

test('auth routes - refresh takes the body token over the cookie and answers the way it arrived', async (t) => {
  const seen = []
  const authority = { refresh: async ({ refreshToken }) => { seen.push(refreshToken); return { tokenType: 'Bearer', ...TOKENS, refreshToken: 'rotated' } } }
  const both = await call('/auth/refresh', authority, { body: { refreshToken: 'from-body' }, headers: { cookie: 'mdk_refresh=from-cookie' } })
  t.alike(seen, ['from-body'], 'the body wins')
  t.is(both.value.refreshToken, 'rotated', 'a body token is answered in the body')
  t.absent(both.headers['set-cookie'], 'and the cookie is left alone')
  const cookie = await call('/auth/refresh', authority, { headers: { cookie: 'mdk_refresh=from-cookie' } })
  t.absent('refreshToken' in cookie.value, 'a cookie token is answered in the cookie')
  t.ok(cookie.headers['set-cookie'].startsWith('mdk_refresh=rotated;'), 'the cookie rotates')
})

test('auth routes - a refused refresh from the body leaves the cookie alone', async (t) => {
  const refused = { refresh: async () => { throw Object.assign(new Error('ERR_IDENTITY_REFRESH_REVOKED'), { code: 'ERR_IDENTITY_REFRESH_REVOKED' }) } }
  const res = await call('/auth/refresh', refused, { body: { refreshToken: 'r' }, headers: { cookie: 'mdk_refresh=other' } })
  t.is(res.error.statusCode, 401)
  t.absent(res.headers['set-cookie'])
  const down = await call('/auth/refresh', { refresh: async () => { throw new Error('down') } }, { headers: { cookie: 'mdk_refresh=c' } })
  t.alike([down.error.statusCode, down.error.message], [503, 'ERR_AUTH_UNAVAILABLE'])
  t.ok(/Max-Age=0/.test(down.headers['set-cookie']), 'an issuer failure on a cookie refresh clears the cookie too')
})

test('auth routes - logout clears the cookie even when the issuer fails, and skips it with no token', async (t) => {
  const down = await call('/auth/logout', { logout: async () => { throw new Error('down') } }, { headers: { cookie: 'mdk_refresh=c' } })
  t.alike([down.error.statusCode, down.error.message], [503, 'ERR_AUTH_UNAVAILABLE'])
  t.ok(/^mdk_refresh=;.*Max-Age=0/.test(down.headers['set-cookie']))
  let called = false
  const none = await call('/auth/logout', { logout: async () => { called = true } })
  t.alike(none.value, { revoked: false })
  t.absent(called, 'the issuer is not called')
  const seen = []
  await call('/auth/logout', { logout: async ({ refreshToken }) => { seen.push(refreshToken); return { revoked: true } } }, { body: { refreshToken: 'from-body' }, headers: { cookie: 'mdk_refresh=from-cookie' } })
  t.alike(seen, ['from-body'], 'the body wins')
})

test('auth routes - /auth/me reads one bearer token', async (t) => {
  const seen = []
  const authority = { verify: async (token) => { seen.push(token); return { kind: 'user', sub: 'u' } } }
  for (const authorization of ['Bearer t', 'bearer t', 'BEARER t', 'Bearer   t  ']) {
    t.alike((await call('/auth/me', authority, { headers: { authorization } })).value, { kind: 'user', sub: 'u' }, JSON.stringify(authorization))
  }
  t.alike(seen, ['t', 't', 't', 't'])
  for (const authorization of ['Bearer a b', 'Basic dTpw', 'Bearer', 'Bearer ', 't']) {
    const res = await call('/auth/me', authority, { headers: { authorization } })
    t.alike([res.error?.statusCode, res.error?.message], [401, 'ERR_AUTH_UNAUTHORIZED'], JSON.stringify(authorization))
  }
  t.is(seen.length, 4, 'a malformed header never reaches the verifier')
  const refused = await call('/auth/me', { verify: async () => { throw new Error('ERR_IDENTITY_TOKEN_EXPIRED') } }, { headers: { authorization: 'Bearer t' } })
  t.alike([refused.error.statusCode, refused.error.message], [401, 'ERR_AUTH_UNAUTHORIZED'], 'the verifier\'s reason is not echoed')
})
