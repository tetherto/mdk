'use strict'

const test = require('brittle')
const { createRouteAuthz } = require('../../../workers/lib/authz')
const { createAuthRoutes } = require('../../../workers/lib/auth-routes')
const { remoteAuthority } = require('../../../workers/lib/authority')
const { createTestAuth } = require('@tetherto/mdk-kernel/testing')
const { localAuthority } = require('../../../workers/lib/authority')

function fakeReq (headers = {}, extra = {}) {
  const logs = []
  return { headers, log: { info: (obj) => logs.push(obj.authz) }, logs, params: {}, query: {}, body: {}, protocol: 'http', ...extra }
}
function fakeRep () {
  const headers = {}
  return { headers, header (k, v) { headers[k] = v; return this } }
}
const fakeAuthority = (over = {}) => ({
  verify: async (t) => { if (t !== 'good') throw Object.assign(new Error('ERR_IDENTITY_TOKEN_SIGNATURE'), { code: 'ERR_IDENTITY_TOKEN_SIGNATURE' }); return { kind: 'user', sub: 'u' } },
  evaluate: (id, r) => ({ allowed: r.resourceName === 'ok', reason: r.resourceName === 'ok' ? 'matched' : 'ERR_RBAC_NO_MATCHING_RULE', role: r.resourceName === 'ok' ? 'r' : undefined, policyVersion: 'v1' }),
  ...over
})

test('authz: 401 without or with a bad token, logged; the identity is set from a good one', async (t) => {
  const authz = createRouteAuthz({ name: 'ops' }, { id: 'cmd', method: 'POST', path: '/miners/command', resourceName: { body: 'target' } }, fakeAuthority())
  t.alike(authz.access, { resource: 'ops/miners/command', verb: 'create', nameFrom: { from: 'body', field: 'target' } })

  const none = fakeReq()
  await t.exception(authz.onRequest(none, fakeRep()), /ERR_AUTH_UNAUTHORIZED/)
  t.is(none.logs[0].reason, 'no-token')
  const bad = fakeReq({ authorization: 'Bearer nope' })
  const rep = fakeRep()
  await t.exception(authz.onRequest(bad, rep), /ERR_AUTH_UNAUTHORIZED/)
  t.alike([bad.logs[0].decision, bad.logs[0].reason, rep.headers['www-authenticate']], ['unauthenticated', 'ERR_IDENTITY_TOKEN_SIGNATURE', 'Bearer error="invalid_token"'])
  await t.exception(authz.onRequest(fakeReq({ authorization: 'Basic good' }), fakeRep()), /ERR_AUTH_UNAUTHORIZED/, 'bearer only')

  const good = fakeReq({ authorization: 'bearer  good ' })
  await authz.onRequest(good, fakeRep())
  t.alike(good._info, { kind: 'user', sub: 'u' })
})

test('authz: a user token is kept for the forward, never as the identity; a service-account token is not', async (t) => {
  const route = { id: 'cmd', method: 'POST', path: '/miners/command' }
  const user = fakeReq({ authorization: 'Bearer good' })
  await createRouteAuthz({ name: 'ops' }, route, fakeAuthority()).onRequest(user, fakeRep())
  t.is(user._actorToken, 'good')
  t.absent(JSON.stringify(user._info).includes('good'), 'the identity never carries the token')

  const agent = fakeReq({ authorization: 'Bearer good' })
  await createRouteAuthz({ name: 'ops' }, route, fakeAuthority({ verify: async () => ({ kind: 'serviceaccount', sub: 'agent:x' }) })).onRequest(agent, fakeRep())
  t.absent(agent._actorToken)
})

test('authz: 403 when no rule matches; every decision is logged with caller, app, route and policy', async (t) => {
  const authz = createRouteAuthz({ name: 'ops' }, { id: 'cmd', method: 'POST', path: '/miners/command', resourceName: { body: 'target' } }, fakeAuthority())
  const allow = fakeReq({ authorization: 'Bearer good' }, { body: { target: 'ok' } })
  await authz.onRequest(allow, fakeRep())
  await authz.preHandler(allow)
  t.alike(allow.logs[0], {
    app: 'ops',
    route: 'cmd',
    method: 'POST',
    path: '/miners/command',
    resource: 'ops/miners/command',
    verb: 'create',
    kind: 'user',
    sub: 'u',
    resourceName: 'ok',
    decision: 'allow',
    reason: 'matched',
    role: 'r',
    policyVersion: 'v1'
  })

  const deny = fakeReq({ authorization: 'Bearer good' }, { body: { target: 'rack-9' } })
  await authz.onRequest(deny, fakeRep())
  const err = await authz.preHandler(deny).catch((e) => e)
  t.alike([err.statusCode, err.message], [403, 'ERR_AUTH_FORBIDDEN: u may not create ops/miners/command rack-9'])
  t.is(deny.logs[0].decision, 'deny')
})

test('auth routes: issuer refusals map to 401, 429, 400 and 503', async (t) => {
  const refuse = (message) => fakeAuthority({ login: async () => { throw Object.assign(new Error(message), { code: message.split(':')[0] }) } })
  const loginWith = async (authority) => {
    const [login] = createAuthRoutes(authority)
    return login.handler(fakeReq({}, { body: { username: 'u', password: 'p' } }), fakeRep()).catch((e) => e)
  }
  t.is((await loginWith(refuse('ERR_IDENTITY_INVALID_CREDENTIALS'))).statusCode, 401)
  t.is((await loginWith(refuse('ERR_IDENTITY_LOGIN_THROTTLED: retry in 30s'))).statusCode, 429)
  t.is((await loginWith(refuse('ERR_IDENTITY_USER_NAME_INVALID'))).statusCode, 400)
  const down = await loginWith(refuse('socket hang up'))
  t.alike([down.statusCode, down.message], [503, 'ERR_AUTH_UNAVAILABLE'], 'internals are not echoed')
})

test('auth routes: Secure cookie over https; cookie parsing; logout without a session', async (t) => {
  const tokens = { tokenType: 'Bearer', accessToken: 'a', expiresIn: 600, refreshToken: 'id.secret', refreshExpiresIn: 100 }
  const seen = []
  const authority = fakeAuthority({ login: async () => tokens, refresh: async (r) => { seen.push(r.refreshToken); return tokens }, logout: async () => ({ revoked: true }) })
  const [login, , refresh, logout, me] = createAuthRoutes(authority)

  const rep = fakeRep()
  t.alike(await login.handler(fakeReq({}, { body: { username: 'u', password: 'p' }, protocol: 'https' }), rep), { tokenType: 'Bearer', accessToken: 'a', expiresIn: 600 })
  t.ok(rep.headers['set-cookie'].endsWith('Max-Age=100; Secure'))

  await refresh.handler(fakeReq({ cookie: 'other=1; mdk_refresh=id.secret%3D; x=y' }, { body: {} }), fakeRep())
  t.alike(seen, ['id.secret='], 'the cookie is found among others and decoded')

  const out = fakeRep()
  t.alike(await logout.handler(fakeReq({}, { body: {} }), out), { revoked: false })
  t.ok(/Max-Age=0/.test(out.headers['set-cookie']))
  t.alike(await logout.handler(fakeReq({ cookie: 'mdk_refresh=x' }, { body: {} }), fakeRep()), { revoked: true })

  t.alike(await me.handler(fakeReq({ authorization: 'Bearer good' })), { kind: 'user', sub: 'u' })
  await t.exception(me.handler(fakeReq({ authorization: 'Bearer bad' })), /ERR_AUTH_UNAUTHORIZED/)
})

test('remote authority: verifies from the JWKS, refetches it for a new key, follows the policy', async (t) => {
  const auth = await createTestAuth({ policy: { roles: [{ name: 'r', rules: [{ resources: ['echo/*'], verbs: ['get'] }] }], bindings: [{ role: 'r', subjects: [{ kind: 'User', name: 'u' }] }] } })
  t.teardown(() => auth.close())
  await auth.identity.upsertUser({ name: 'u', password: 'correct horse battery' })
  let jwksCalls = 0
  let rbacFails = false
  const client = {
    getJwks: async () => { jwksCalls++; return auth.identity.jwks() },
    getRbac: async () => { if (rbacFails) throw new Error('down'); return { record: auth.rbac.info() } },
    login: (u, p) => auth.identity.login({ username: u, password: p }).catch((e) => ({ error: e.message })),
    refreshToken: (r) => auth.identity.refresh({ refreshToken: r }),
    logout: (r) => auth.identity.logout({ refreshToken: r }),
    close: async () => {}
  }
  const remote = remoteAuthority({ client, pollMs: 60000 })
  await remote.start()
  t.teardown(() => remote.close())

  const { accessToken } = await remote.login({ username: 'u', password: 'correct horse battery' })
  t.alike(await remote.verify(accessToken), { kind: 'user', sub: 'u' })
  t.ok(remote.evaluate({ kind: 'user', sub: 'u' }, { resource: 'echo/x', verb: 'get' }).allowed)
  t.is(remote.policyVersion(), auth.rbac.current().version)
  await t.exception(remote.login({ username: 'u', password: 'wrong password!!' }), /ERR_IDENTITY_INVALID_CREDENTIALS/, 'a refusal reply is thrown')

  // A rotated key the Gateway has not seen: one JWKS fetch, once 10 s have passed since the last.
  await auth.identity.rotateSigningKey()
  const fresh = (await auth.identity.login({ username: 'u', password: 'correct horse battery' })).accessToken
  await t.exception(remote.verify(fresh), /ERR_IDENTITY_TOKEN_KEY_UNKNOWN/, 'too soon to refetch')
  const realNow = Date.now
  Date.now = () => realNow() + 11000
  try {
    t.alike(await remote.verify(fresh), { kind: 'user', sub: 'u' })
  } finally {
    Date.now = realNow
  }
  t.is(jwksCalls, 2)

  // A Kernel that cannot be reached keeps the policy in force.
  rbacFails = true
  const before = remote.policyVersion()
  await remote.start()
  t.is(remote.policyVersion(), before)
})

test('remote authority: refuses tokens the issuer would, from the polled token versions', async (t) => {
  const auth = await createTestAuth({ policy: { roles: [{ name: 'r', rules: [{ resources: ['echo/*'], verbs: ['get'] }] }], bindings: [{ role: 'r', subjects: [{ kind: 'User', name: 'u' }] }] } })
  t.teardown(() => auth.close())
  await auth.identity.upsertUser({ name: 'u', password: 'correct horse battery', groups: ['ops'] })
  let polls = 0
  const client = {
    getJwks: async () => auth.identity.jwks(),
    getRbac: async () => { polls++; return { record: auth.rbac.info(), tokenVersions: auth.identity.tokenVersions() } },
    close: async () => {}
  }
  let clock = Date.now()
  const remote = remoteAuthority({ client, pollMs: 60000, now: () => clock })
  await remote.start()
  t.teardown(() => remote.close())

  const token = async () => (await auth.identity.login({ username: 'u', password: 'correct horse battery' })).accessToken
  const before = await token()
  t.alike(await remote.verify(before), { kind: 'user', sub: 'u', groups: ['ops'] })

  // A group change: from the next poll (every pollMs, 5 s by default) the old token is refused.
  await auth.identity.upsertUser({ name: 'u', groups: [] })
  await remote.start() // the poll pollMs would run
  await t.exception(remote.verify(before), /ERR_IDENTITY_TOKEN_REVOKED: issued before the subject changed/)
  t.alike(await remote.verify(await token()), { kind: 'user', sub: 'u' }, 'a token issued after the change is fine')

  // A user created after the last poll: one forced poll picks them up.
  await auth.identity.upsertUser({ name: 'new', password: 'correct horse battery' })
  clock += 2000
  const polled = polls
  const fresh = (await auth.identity.login({ username: 'new', password: 'correct horse battery' })).accessToken
  t.alike(await remote.verify(fresh), { kind: 'user', sub: 'new' })
  t.is(polls, polled + 1)

  // A deleted user's token is refused from the next poll.
  await auth.identity.deleteUser('new')
  await remote.start()
  await t.exception(remote.verify(fresh), /ERR_IDENTITY_TOKEN_REVOKED: the subject no longer exists/)
})

test('remote authority: a policy it cannot refresh for maxStaleMs allows nothing', async (t) => {
  const policy = { roles: [{ name: 'r', rules: [{ resources: ['echo/*'], verbs: ['get'] }] }], bindings: [{ role: 'r', subjects: [{ kind: 'User', name: 'u' }] }] }
  const auth = await createTestAuth({ policy })
  t.teardown(() => auth.close())
  let down = false
  const client = { getJwks: async () => auth.identity.jwks(), getRbac: async () => { if (down) throw new Error('down'); return { record: auth.rbac.info() } }, close: async () => {} }
  let clock = Date.now()
  const remote = remoteAuthority({ client, pollMs: 60000, maxStaleMs: 30000, now: () => clock })
  await remote.start()
  t.teardown(() => remote.close())
  const read = { resource: 'echo/x', verb: 'get' }
  const u = { kind: 'user', sub: 'u' }

  down = true
  clock += 20000
  await remote.start() // a failed poll
  t.ok(remote.evaluate(u, read).allowed, 'a blip keeps the policy in force')
  clock += 20000
  t.alike([remote.evaluate(u, read).allowed, remote.evaluate(u, read).reason], [false, 'ERR_RBAC_POLICY_STALE'], 'past maxStaleMs it fails closed')
  t.absent(remote.allowsSome(u, read))
  down = false
  await remote.start()
  t.ok(remote.evaluate(u, read).allowed, 'a successful poll restores it')
})

test('local authority needs a started Kernel', (t) => {
  t.exception(() => localAuthority({}), /ERR_GATEWAY_AUTHORITY_KERNEL_INVALID/)
})
