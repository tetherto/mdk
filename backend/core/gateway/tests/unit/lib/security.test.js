'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const Fastify = require('fastify')
const {
  resolveSecurityOptions,
  buildHostAllowlist,
  isHostAllowed,
  createHostCheck,
  createAuthHook,
  DEFAULT_BODY_LIMIT
} = require('../../../workers/lib/security')
const { loadPlugin } = require('../../../workers/lib/plugin-loader')
const { buildFastifyRoutes, errorResponse } = require('../../../workers/lib/plugin-adapter')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-gateway-security-test-' + Date.now())

// ==================== resolveSecurityOptions ====================

test('resolveSecurityOptions - safe defaults', (t) => {
  const o = resolveSecurityOptions({}, {})
  t.is(o.authVerifier, null, 'no verifier')
  t.alike(o.allowedHosts, [], 'no extra hosts')
  t.is(o.trustProxy, false, 'proxy headers are not trusted')
  t.is(o.bodyLimit, DEFAULT_BODY_LIMIT, '1 MiB body limit')
  t.is(o.rateLimit.max, 300, 'rate limit on')
  t.ok(o.helmet, 'security headers on')
})

test('resolveSecurityOptions - ctx wins over common.json, false switches a layer off', (t) => {
  const verifier = async () => ({})
  const o = resolveSecurityOptions(
    { trustProxy: true, bodyLimit: 10, rateLimit: { max: 5 }, helmet: false },
    { authVerifier: verifier, bodyLimit: 20, rateLimit: false, allowedHosts: ['mdk.local'] }
  )
  t.is(o.authVerifier, verifier)
  t.is(o.trustProxy, true, 'from common.json')
  t.is(o.bodyLimit, 20, 'ctx overrides common.json')
  t.is(o.rateLimit, false)
  t.is(o.helmet, false)
  t.alike(o.allowedHosts, ['mdk.local'])
})

test('resolveSecurityOptions - CLI strings and invalid values', (t) => {
  const o = resolveSecurityOptions({}, { allowedHosts: 'a.local, b.local:8080', bodyLimit: '2048', trustProxy: 'false' })
  t.alike(o.allowedHosts, ['a.local', 'b.local:8080'])
  t.is(o.bodyLimit, 2048)
  t.is(o.trustProxy, false)
  t.exception(() => resolveSecurityOptions({}, { authVerifier: 'yes' }), /ERR_GATEWAY_AUTH_VERIFIER_INVALID/)
  t.exception(() => resolveSecurityOptions({ bodyLimit: -1 }, {}), /ERR_GATEWAY_BODY_LIMIT_INVALID/)
  t.exception(() => resolveSecurityOptions({ allowedHosts: { a: 1 } }, {}), /ERR_GATEWAY_ALLOWED_HOSTS_INVALID/)
})

test('resolveSecurityOptions - there are no built-in verifiers; a name is refused', (t) => {
  t.exception(() => resolveSecurityOptions({}, { authVerifier: 'loopback' }), /ERR_GATEWAY_AUTH_VERIFIER_INVALID: there are no built-in verifiers \("loopback" was removed\)/)
  t.exception(() => resolveSecurityOptions({ authVerifier: 'loopback' }, {}), /ERR_GATEWAY_AUTH_VERIFIER_INVALID/)
  t.exception(() => resolveSecurityOptions({}, { authVerifier: 42 }), /authVerifier must be a function/)
  const fn = async () => false
  t.is(resolveSecurityOptions({}, { authVerifier: fn }).authVerifier, fn)
})

test('buildHostAllowlist - loopback on the bound port by default', (t) => {
  const list = buildHostAllowlist([], { port: '3000' })
  t.ok(isHostAllowed(list, 'localhost:3000'))
  t.ok(isHostAllowed(list, '127.0.0.1:3000'))
  t.ok(isHostAllowed(list, '[::1]:3000'))
  t.ok(isHostAllowed(list, 'LOCALHOST:3000'), 'case-insensitive')
  t.absent(isHostAllowed(list, 'localhost:3001'), 'other port')
  t.absent(isHostAllowed(list, 'localhost'), 'no port means :80')
  t.absent(isHostAllowed(list, 'attacker.example:3000'), 'a rebound name')
  t.absent(isHostAllowed(list, undefined), 'missing Host')
})

test('buildHostAllowlist - bound address and configured hosts', (t) => {
  const list = buildHostAllowlist(['mdk.example.com', '10.0.0.4:3000'], { port: '3000', host: '192.168.1.5' })
  t.ok(isHostAllowed(list, '192.168.1.5:3000'), 'a specific bind address is allowed')
  t.ok(isHostAllowed(list, 'mdk.example.com'), 'a host without a port matches any port')
  t.ok(isHostAllowed(list, 'mdk.example.com:443'))
  t.ok(isHostAllowed(list, '10.0.0.4:3000'))
  t.absent(isHostAllowed(list, '10.0.0.4:3001'), 'a host with a port matches only that port')

  const wildcard = buildHostAllowlist([], { port: '3000', host: '0.0.0.0' })
  t.absent(isHostAllowed(wildcard, '0.0.0.0:3000'), 'a wildcard bind adds nothing')

  t.is(buildHostAllowlist(['*'], { port: '3000' }), null, '* turns the check off')
  t.ok(isHostAllowed(null, 'anything'))
})

// ==================== createAuthHook ====================

test('createAuthHook - fails closed', async (t) => {
  const route = { id: 'r' }
  await t.exception(() => createAuthHook(null, route)({}), /ERR_AUTH_UNAUTHORIZED/, 'no verifier')
  await t.exception(() => createAuthHook(async () => null, route)({}), /ERR_AUTH_UNAUTHORIZED/, 'falsy identity')
  await t.exception(() => createAuthHook(async () => { throw new Error('db down') }, route)({}), /ERR_AUTH_UNAUTHORIZED/, 'unexpected throw')

  const denied = Object.assign(new Error('ERR_AUTH_PERM_DENIED'), { statusCode: 403 })
  const err = await createAuthHook(async () => { throw denied }, route)({}).catch(e => e)
  t.is(err, denied, 'a verifier may answer 403 with its own ERR_* code')

  const req = {}
  await createAuthHook(async () => true, route)(req)
  t.alike(req._info, {}, 'true is an anonymous identity')
})

// ==================== end to end over Fastify ====================

// Mirrors what http.node.wrk.js hands svc-facs-httpd: helmet and rate-limit as
// plugins, the Host check as a root onRequest hook, app routes, the error filter.
// The routes are mounted as app "p" at "/", with a runtime client that answers
// from the plugin's own handlers.
async function buildServer (manifestRoutes, sec, { port = '3000', ctx: ctxOverride, invoke } = {}) {
  const dir = path.join(FIXTURES_DIR, 'srv-' + Math.random().toString(36).slice(2))
  fs.mkdirSync(path.join(dir, 'controllers'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'mdk-plugin.json'), JSON.stringify({ name: '@test/p', version: '1.0.0', routes: manifestRoutes }))
  fs.writeFileSync(path.join(dir, 'controllers/c.js'), '\'use strict\'\nmodule.exports = async function (req) { return { info: req._info, body: req.body } }')

  const o = resolveSecurityOptions({}, sec)
  const app = Fastify({ bodyLimit: o.bodyLimit, trustProxy: o.trustProxy })
  if (o.helmet) app.register(require('@fastify/helmet'), o.helmet)
  if (o.rateLimit) app.register(require('@fastify/rate-limit'), o.rateLimit)
  const allow = buildHostAllowlist(o.allowedHosts, { port })
  if (allow) app.addHook('onRequest', createHostCheck(allow))
  const ctx = ctxOverride || { conf: { cacheTiming: {} }, queuedRequests: new Map(), lru_30s: { get: () => undefined, set: () => {} } }
  const plugin = loadPlugin(dir)
  const handlers = new Map(plugin.routes.map(r => [r.id, r._handler]))
  const keyFile = path.join(dir, 'runtime.key')
  fs.writeFileSync(keyFile, 'ab'.repeat(32))
  const mounted = { name: 'p', mount: '/', keyFile, routes: plugin.routes }
  const client = { invoke: invoke || (async (key, routeId, req, { identity } = {}) => handlers.get(routeId)({ ...req, _info: identity || {} })) }
  app.register(async () => {
    for (const r of buildFastifyRoutes(mounted, client, ctx, { authVerifier: o.authVerifier })) app.route(r)
  })
  app.setErrorHandler((err, request, reply) => {
    const body = errorResponse(err)
    reply.status(body.statusCode).send(body)
  })
  await app.ready()
  return app
}

const HOST = { host: '127.0.0.1:3000' }

test('gateway http - auth: true is 401 without a verifier, other routes stay open', async (t) => {
  const app = await buildServer([
    { id: 'open', method: 'GET', path: '/open', handler: './controllers/c.js' },
    { id: 'closed', method: 'GET', path: '/closed', handler: './controllers/c.js', auth: true }
  ], {})
  t.teardown(() => app.close())

  const open = await app.inject({ url: '/open', headers: HOST })
  t.is(open.statusCode, 200)
  const closed = await app.inject({ url: '/closed', headers: { ...HOST, authorization: 'Bearer x' } })
  t.is(closed.statusCode, 401)
  t.is(closed.json().message, 'ERR_AUTH_UNAUTHORIZED')
})

test('gateway http - verifier identity reaches the controller; auth runs before body validation', async (t) => {
  let calls = 0
  const authVerifier = async (req) => { calls++; return req.headers.authorization === 'Bearer ok' && { user: { userId: 'op' } } }
  const app = await buildServer([{
    id: 'write',
    handler: './controllers/c.js',
    auth: true,
    http: {
      method: 'POST',
      path: '/write',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['a'], properties: { a: { type: 'string' } } } } } }
    }
  }], { authVerifier })
  t.teardown(() => app.close())

  const anon = await app.inject({ method: 'POST', url: '/write', headers: HOST, payload: { nope: 1 } })
  t.is(anon.statusCode, 401, 'unauthenticated bodies are refused before validation')

  const bad = await app.inject({ method: 'POST', url: '/write', headers: { ...HOST, authorization: 'Bearer ok' }, payload: { nope: 1 } })
  t.is(bad.statusCode, 400, 'requestBody is validated')

  const ok = await app.inject({ method: 'POST', url: '/write', headers: { ...HOST, authorization: 'Bearer ok' }, payload: { a: 'x' } })
  t.is(ok.statusCode, 200)
  t.alike(ok.json().info, { user: { userId: 'op' } }, '_info is the verified identity')
  t.is(calls, 3)
})

test('gateway http - Host allowlist, security headers, body limit, rate limit', async (t) => {
  const app = await buildServer([{ id: 'p', method: 'POST', path: '/p', handler: './controllers/c.js' }], {
    bodyLimit: 64,
    rateLimit: { max: 2, timeWindow: '1 minute' }
  })
  t.teardown(() => app.close())

  const rebound = await app.inject({ method: 'POST', url: '/p', headers: { host: 'evil.example:3000' }, payload: {} })
  t.is(rebound.statusCode, 403, 'foreign Host is refused')
  t.is(rebound.json().message, 'ERR_GATEWAY_HOST_NOT_ALLOWED')

  const ok = await app.inject({ method: 'POST', url: '/p', headers: HOST, payload: { a: 1 } })
  t.is(ok.statusCode, 200)
  t.is(ok.headers['x-content-type-options'], 'nosniff', 'helmet headers are set')
  t.ok(ok.headers['content-security-policy'], 'a CSP is set')
  t.absent(/upgrade-insecure-requests/.test(ok.headers['content-security-policy']), 'plain-http LAN UIs keep working')

  const big = await app.inject({ method: 'POST', url: '/p', headers: HOST, payload: { a: 'x'.repeat(200) } })
  t.is(big.statusCode, 413, 'bodyLimit is enforced')

  const limited = await app.inject({ method: 'POST', url: '/p', headers: HOST, payload: {} })
  t.is(limited.statusCode, 429, 'rate limit kicks in')
  t.is(limited.json().message, 'ERR_RATE_LIMITED')
})

test('gateway http - failed auth attempts count against the rate limit', async (t) => {
  let calls = 0
  const app = await buildServer([{ id: 'c', method: 'GET', path: '/c', handler: './controllers/c.js', auth: true }], {
    authVerifier: async () => { calls++; return false },
    rateLimit: { max: 2, timeWindow: '1 minute' }
  })
  t.teardown(() => app.close())

  const codes = []
  for (let i = 0; i < 4; i++) codes.push((await app.inject({ url: '/c', headers: HOST })).statusCode)
  t.alike(codes, [401, 401, 429, 429])
  t.is(calls, 2, 'the verifier is not reached once the caller is throttled')
})

test('WrkServerHttp - httpd facility gets the hardened options', (t) => {
  const WrkServerHttp = require('../../../workers/http.node.wrk')
  const base = Object.getPrototypeOf(WrkServerHttp.prototype)
  const realInit = base.init
  base.init = function () {}
  t.teardown(() => { base.init = realInit })

  let facs
  const fake = { conf: {}, ctx: { port: 3000, bodyLimit: 4096 }, setInitFacs (f) { facs = f } }
  WrkServerHttp.prototype.init.call(fake)
  const httpdOpts = facs.find(f => f[1] === '@tetherto/svc-facs-httpd')[4]

  t.is(httpdOpts.addDefaultRoutes, false, 'no GET /echo')
  t.is(httpdOpts.trustProxy, false, 'trustProxy off by default')
  t.is(httpdOpts.bodyLimit, 4096, 'bodyLimit passed through')
  t.is(httpdOpts.staticRootPath, undefined, 'no static serving unless configured')
})

test('WrkServerHttp - a malformed appTimeoutMs fails the boot', (t) => {
  const WrkServerHttp = require('../../../workers/http.node.wrk')
  const base = Object.getPrototypeOf(WrkServerHttp.prototype)
  const realInit = base.init
  base.init = function () {}
  t.teardown(() => { base.init = realInit })

  const fake = { conf: { appTimeoutMs: '60s' }, ctx: { port: 3000 }, setInitFacs () {} }
  t.exception(() => WrkServerHttp.prototype.init.call(fake), /ERR_GATEWAY_APP_TIMEOUT_INVALID/)
})

// ==================== cache and identity ====================

function memoryCacheCtx () {
  const store = new Map()
  return { store, conf: { cacheTiming: {} }, queuedRequests: new Map(), lru_30s: { get: k => store.get(k), set: (k, v) => store.set(k, v) } }
}

test('gateway http - an auth: true cached route never shares entries across identities', async (t) => {
  const ctx = memoryCacheCtx()
  let calls = 0
  const invoke = async (key, routeId, req, { identity } = {}) => { calls++; return { who: identity.user.userId, n: calls } }
  const authVerifier = async (req) => ({ user: { userId: req.headers['x-user'] }, perms: ['read'] })
  const app = await buildServer([{ id: 'me', method: 'GET', path: '/me', handler: './controllers/c.js', auth: true, cache: ['query.q'] }], { authVerifier }, { ctx, invoke })
  t.teardown(() => app.close())

  const get = (user) => app.inject({ url: '/me?q=1', headers: { ...HOST, 'x-user': user } }).then(r => r.json())
  const a1 = await get('alice')
  const b1 = await get('bob')
  const a2 = await get('alice')
  t.is(a1.who, 'alice')
  t.is(b1.who, 'bob', 'bob does not get alice\'s cached response')
  t.alike(a2, a1, 'the same identity still hits its own cache entry')
  t.is(calls, 2)
  t.is(ctx.store.size, 2)
  for (const k of ctx.store.keys()) t.ok(/"id:[0-9a-f]{64}"\]$/.test(k), 'key ends with an identity hash')

  // In-flight dedup is per identity too.
  calls = 0
  ctx.store.clear()
  const [c, d] = await Promise.all([get('carol'), get('dave')])
  t.is(c.who, 'carol')
  t.is(d.who, 'dave')
  t.is(calls, 2)
})

test('gateway http - an open cached route keeps the shared key', async (t) => {
  const ctx = memoryCacheCtx()
  let calls = 0
  const invoke = async () => ({ n: ++calls })
  const app = await buildServer([{ id: 'pub', method: 'GET', path: '/pub', handler: './controllers/c.js', cache: ['query.q'] }], {}, { ctx, invoke })
  t.teardown(() => app.close())

  await app.inject({ url: '/pub?q=1', headers: HOST })
  await app.inject({ url: '/pub?q=1', headers: HOST })
  t.is(calls, 1)
  t.alike([...ctx.store.keys()], ['["p","pub","1"]'])
})

// ==================== gateway key file ====================

test('writeGatewayKeyFile - private directory, file not group/other-writable, no temp left behind', { skip: process.platform === 'win32' }, (t) => {
  const { writeGatewayKeyFile } = require('../../../workers/http.node.wrk')
  const dir = path.join(FIXTURES_DIR, 'keys-' + Math.random().toString(36).slice(2), 'nested')
  const file = path.join(dir, 'gateway.key')
  const umask = process.umask(0)
  t.teardown(() => process.umask(umask))

  writeGatewayKeyFile(file, 'ab'.repeat(32))
  t.is(fs.statSync(dir).mode & 0o777, 0o700)
  t.is(fs.statSync(file).mode & 0o777, 0o644)
  t.is(fs.readFileSync(file, 'utf8'), 'ab'.repeat(32))

  fs.chmodSync(file, 0o666)
  writeGatewayKeyFile(file, 'cd'.repeat(32))
  t.is(fs.statSync(file).mode & 0o777, 0o644, 'a replaced file gets the new mode')
  t.is(fs.readFileSync(file, 'utf8'), 'cd'.repeat(32))
  t.alike(fs.readdirSync(dir), ['gateway.key'])
})
