'use strict'

const test = require('brittle')
const { createAuthRoutes } = require('../../../workers/lib/auth-routes')

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
