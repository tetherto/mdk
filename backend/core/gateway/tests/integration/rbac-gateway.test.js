'use strict'

// spec.rbac at the Gateway, end to end: sign-in through the issuer, a bearer
// token and a rule on every app route, the identity forwarded to a real app
// runtime over a local HyperDHT testnet.

const test = require('brittle')
const net = require('net')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const { startGateway } = require('@tetherto/mdk-core')
const { createTestAuth } = require('@tetherto/mdk-kernel/testing')
const { createAssertion, ServiceAccountTokenSource, gatewayTokenRequest } = require('@tetherto/mdk-identity')
const { localAuthority } = require('../../workers/lib/authority')
const { ECHO_APP, tmpDir, capturingLogger } = require('../fixtures/helpers')

const PASSWORD = 'correct horse battery'
const POLICY = {
  roles: [
    { name: 'viewer', rules: [{ resources: ['echo/*'], verbs: ['get', 'list'] }] },
    { name: 'writer', rules: [{ resources: ['echo/echo'], verbs: ['create'] }] },
    { name: 'rack3', rules: [{ resources: ['echo/named/:id'], verbs: ['get'], resourceNames: ['rack-3-*'] }] }
  ],
  bindings: [
    { role: 'viewer', subjects: [{ kind: 'Group', name: 'ops' }] },
    { role: 'writer', subjects: [{ kind: 'User', name: 'writer@example.com' }] },
    { role: 'rack3', subjects: [{ kind: 'User', name: 'tech' }] },
    { role: 'viewer', subjects: [{ kind: 'ServiceAccount', name: 'test-admin' }] }
  ]
}

function freePort () {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

test('gateway enforces spec.rbac on every app route', { timeout: 120000 }, async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const dir = tmpDir(t)
  const port = await freePort()
  const keyFile = (name) => path.join(dir, 'run', `${name}.key`)
  const gatewayKeyFile = keyFile('gateway')

  const auth = await createTestAuth({ policy: POLICY })
  t.teardown(() => auth.close())
  await auth.identity.upsertUser({ name: 'viewer', email: 'viewer@example.com', groups: ['ops'], password: PASSWORD })
  await auth.identity.upsertUser({ name: 'writer@example.com', groups: ['ops'], password: PASSWORD })
  await auth.identity.upsertUser({ name: 'tech', password: PASSWORD })

  const hnd = await startGateway({
    kernelKey: false,
    env: 'test',
    port,
    root: path.join(dir, 'gateway'),
    bootstrap: testnet.bootstrap,
    apps: [{ name: 'echo', appDir: ECHO_APP, keyFile: keyFile('echo') }],
    gatewayKeyFile,
    authority: localAuthority(auth)
  })
  t.teardown(() => new Promise((resolve) => hnd.stop(resolve)))
  const runtime = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, keyFile: keyFile('echo'), allowedKeyFiles: [gatewayKeyFile], logger: capturingLogger() })
  await runtime.start()
  t.teardown(() => runtime.stop())

  const req = async (url, { method = 'GET', token, body, cookie } = {}) => {
    const headers = {}
    if (token) headers.authorization = `Bearer ${token}`
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (cookie) headers.cookie = cookie
    const res = await fetch(`http://127.0.0.1:${port}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await res.text()
    let json = {}
    try { json = JSON.parse(text) } catch {}
    return { status: res.status, headers: res.headers, body: json }
  }
  const login = async (username, extra = {}) => req('/auth/login', { method: 'POST', body: { username, password: PASSWORD, ...extra } })

  // No token, no route: not even the ones a manifest left open.
  const anon = await req('/apps/echo/whoami')
  t.alike([anon.status, anon.body.message, anon.headers.get('www-authenticate')], [401, 'ERR_AUTH_UNAUTHORIZED', 'Bearer'])
  t.is((await req('/apps/echo/whoami', { token: 'not-a-token' })).status, 401)

  const wrong = await req('/auth/login', { method: 'POST', body: { username: 'viewer', password: 'wrong password!!' } })
  t.alike([wrong.status, wrong.body.message], [401, 'ERR_IDENTITY_INVALID_CREDENTIALS'])
  t.is((await req('/auth/login', { method: 'POST', body: { username: 'viewer' } })).status, 400, 'schema-checked')

  // Sign-in: the access token in the body, the refresh token in an httpOnly cookie only.
  const viewer = await login('viewer')
  t.is(viewer.status, 200)
  t.ok(viewer.body.accessToken)
  t.absent('refreshToken' in viewer.body, 'a browser never sees the refresh token')
  const setCookie = viewer.headers.get('set-cookie')
  t.ok(/^mdk_refresh=[^;]+; HttpOnly; SameSite=Strict; Path=\/auth; Max-Age=\d+$/.test(setCookie), setCookie)
  const cookie = setCookie.split(';')[0]

  const me = await req('/auth/me', { token: viewer.body.accessToken })
  t.alike(me.body, { kind: 'user', sub: 'viewer', email: 'viewer@example.com', groups: ['ops'] })
  t.is((await req('/auth/me')).status, 401)

  // The identity reaches the app runtime; what the policy allows is what passes.
  const whoami = await req('/apps/echo/whoami', { token: viewer.body.accessToken })
  t.alike([whoami.status, whoami.body.info], [200, { kind: 'user', sub: 'viewer', email: 'viewer@example.com', groups: ['ops'] }])
  const denied = await req('/apps/echo/echo', { method: 'POST', token: viewer.body.accessToken, body: { a: 1 } })
  t.alike([denied.status, denied.body.message], [403, 'ERR_AUTH_FORBIDDEN: viewer may not create echo/echo'])

  const writer = await login('writer@example.com')
  const echoed = await req('/apps/echo/echo', { method: 'POST', token: writer.body.accessToken, body: { a: 1 } })
  t.alike([echoed.status, echoed.body.body], [200, { a: 1 }])
  t.absent(echoed.body.headers.authorization, 'the token stays at the Gateway')
  t.absent(echoed.body.headers.cookie)

  // Instance names from the route's declared path param.
  const tech = (await login('tech')).body.accessToken
  t.is((await req('/apps/echo/named/rack-3-07', { token: tech })).status, 200)
  t.is((await req('/apps/echo/named/rack-4-01', { token: tech })).body.message, 'ERR_AUTH_FORBIDDEN: tech may not get echo/named/:id rack-4-01')

  // Cached responses are per caller.
  const counter = async (token) => (await req('/apps/echo/counter?k=a', { token })).body.n
  const first = await counter(viewer.body.accessToken)
  t.is(await counter(viewer.body.accessToken), first)
  t.is(await counter(writer.body.accessToken), first + 1, 'another caller does not share the entry')

  // Refresh from the cookie rotates it. The old one, seconds later, is another
  // tab refreshing at once: it gets the same new cookie, and the session lives.
  // (Later it is theft and revokes the session; see the identity tests.)
  const refreshed = await req('/auth/refresh', { method: 'POST', cookie, body: {} })
  t.is(refreshed.status, 200)
  t.ok(refreshed.body.accessToken)
  t.absent(/; Secure/.test(refreshed.headers.get('set-cookie')), 'plain-HTTP loopback: no Secure flag')
  const rotated = refreshed.headers.get('set-cookie').split(';')[0]
  t.not(rotated, cookie)
  const raced = await req('/auth/refresh', { method: 'POST', cookie, body: {} })
  t.is(raced.status, 200)
  t.is(raced.headers.get('set-cookie').split(';')[0], rotated, 'the second tab gets the same new cookie')
  t.is((await req('/auth/refresh', { method: 'POST', cookie: rotated, body: {} })).status, 200, 'the session lives on')
  const bad = await req('/auth/refresh', { method: 'POST', cookie: `mdk_refresh=${'a'.repeat(22)}.${'b'.repeat(43)}`, body: {} })
  t.ok(/Max-Age=0/.test(bad.headers.get('set-cookie')), 'any other failed refresh clears the cookie')
  t.is((await req('/auth/refresh', { method: 'POST', body: {} })).status, 401, 'no cookie, no refresh')

  // Clients without cookies keep the refresh token themselves.
  const cli = await login('writer@example.com', { refreshIn: 'body' })
  t.ok(cli.body.refreshToken)
  t.absent(cli.headers.get('set-cookie'))
  const cliRefreshed = await req('/auth/refresh', { method: 'POST', body: { refreshToken: cli.body.refreshToken } })
  t.ok(cliRefreshed.body.refreshToken)
  t.alike((await req('/auth/logout', { method: 'POST', body: { refreshToken: cliRefreshed.body.refreshToken } })).body, { revoked: true })
  t.is((await req('/auth/refresh', { method: 'POST', body: { refreshToken: cliRefreshed.body.refreshToken } })).status, 401, 'logged out')

  // An agent signs in over HTTP with its own key, and calls as itself.
  const agent = new ServiceAccountTokenSource({ name: auth.credential.name, privateKey: auth.credential.privateKey, request: gatewayTokenRequest(`http://127.0.0.1:${port}`) })
  const agentToken = await agent.getToken()
  const asAgent = await req('/apps/echo/whoami', { token: agentToken })
  t.alike([asAgent.status, asAgent.body.info], [200, { kind: 'serviceaccount', sub: 'test-admin' }])
  const badAssertion = await req('/auth/token', { method: 'POST', body: { assertion: 'x.y.z' } })
  t.alike([badAssertion.status, badAssertion.body.message], [401, 'ERR_IDENTITY_ASSERTION_INVALID: ERR_IDENTITY_TOKEN_MALFORMED'])

  // A service account's token bound to its HRPC caller is no good over HTTP.
  const assertion = createAssertion({ name: auth.credential.name, privateKey: auth.credential.privateKey })
  const bound = (await auth.identity.token({ assertion, cnf: 'ab'.repeat(32) })).accessToken
  t.is((await req('/apps/echo/whoami', { token: bound })).status, 401)
})
