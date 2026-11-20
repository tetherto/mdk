'use strict'

// Every error code a route declares names the HTTP status it arrives with, and
// a caller can actually receive it with that status. Each case sends a request
// through the validation the Gateway builds from this route table, then the real
// controller, then the app runtime's status rule. A code the request validation
// stops first never reaches the controller, so it cannot be declared.
//
// Kernel and client replies are stubbed. Which codes the Kernel can send is
// checked against its source, cited in each declaration's description.

const test = require('brittle')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const exampleDir = path.join(__dirname, '..', '..')
execFileSync('node', [path.join(exampleDir, 'deploy', 'setup-config.js')])

const pluginDir = path.join(exampleDir, 'backend', 'gateway-plugins', 'site')
const table = require(path.join(pluginDir, 'mdk-plugin.json'))
const runtimeDir = path.dirname(require.resolve('@tetherto/mdk-app-runtime'))
const { normalizeRoute } = require('@tetherto/mdk-app-runtime/lib/plugin-loader')
// The status rule the app runtime applies to a thrown error (not a public export).
const { toErrorResponse } = require(path.join(runtimeDir, 'lib', 'protocol'))
// The Fastify the Gateway serves app routes with.
const gatewayDir = path.dirname(require.resolve('@tetherto/mdk-gateway/package.json'))
const httpdDir = path.dirname(require.resolve('@tetherto/svc-facs-httpd/package.json', { paths: [gatewayDir] }))
const Fastify = require(require.resolve('fastify', { paths: [httpdDir] }))

const HANDLER = { 'site.overview': 'overview', 'site.history': 'history', 'site.access': 'access', 'site.activity': 'activity', 'site.miner-command': 'command', 'site.miner-pools': 'pools' }
const controller = (id) => require(path.join(pluginDir, 'controllers', HANDLER[id]))

const fails = (message) => async () => { throw new Error(message) }
const failing = (message) => new Proxy({}, { get: () => fails(message) })
const rejected = (error) => ({ sendCommand: async () => ({ status: 'REJECTED', ...(error ? { error } : {}) }) })
const onePool = { listWorkers: async () => ({ workers: [{ workerId: 'pool-worker', deviceFamily: 'minerpool', deviceIds: ['POOL-1'] }] }) }
const pool = { url: 'stratum+tcp://pool.example:3333', worker_name: 'w' }
const signedIn = { kind: 'user', sub: 'u' }

const GET = (url) => ({ method: 'GET', url })
const POST = (url, payload) => ({ method: 'POST', url, payload })
const REQUEST = {
  'site.overview': GET('/site/overview'),
  'site.history': GET('/site/history'),
  'site.access': GET('/site/access'),
  'site.activity': GET('/site/activity'),
  'site.miner-command': POST('/site/miners/M-1/command', { mode: 'low' }),
  'site.miner-pools': POST('/site/miners/M-1/pools', { pools: [pool] })
}

// [route id, code, request (default REQUEST[id]), ctx, extra request fields]
// ctx undefined runs the controller as the Gateway does (req.mdk, req._info).
const CASES = [
  ...Object.keys(HANDLER).flatMap((id) => [
    [id, 'ERR_MDK_CLIENT_UNAVAILABLE', null, { mdkClient: failing('ERR_MDK_CLIENT_UNAVAILABLE: CHANNEL_CLOSED') }, { _info: signedIn }],
    [id, 'ERR_KERNEL_ACTION_FORBIDDEN', null, { mdkClient: failing('ERR_KERNEL_ACTION_FORBIDDEN: not allowed') }, { _info: signedIn }]
  ]),
  ['site.history', 'ERR_INVALID_DATE_RANGE', GET('/site/history?start=2&end=1'), { mdkClient: {} }],
  ['site.history', 'ERR_UNKNOWN_DEVICE_ID', GET('/site/history?deviceId=NOPE'), { mdkClient: onePool }],
  ['site.access', 'ERR_SIGN_IN_REQUIRED', null, { mdkClient: {} }, { _info: {} }],
  ['site.activity', 'ERR_SIGN_IN_REQUIRED', null, undefined, { mdk: {}, _info: {} }],
  ['site.miner-command', 'ERR_DEVICE_ID_REQUIRED', POST('/site/miners//command', { mode: 'low' }), { mdkClient: {} }],
  ['site.miner-pools', 'ERR_DEVICE_ID_REQUIRED', POST('/site/miners//pools', { pools: [pool] }), { mdkClient: {} }],
  ['site.miner-pools', 'ERR_INVALID_POOLS', POST('/site/miners/M-1/pools', { pools: [] }), { mdkClient: {} }],
  ['site.miner-pools', 'ERR_INVALID_POOLS', POST('/site/miners/M-1/pools', { pools: [{ url: '', worker_name: 'w' }] }), { mdkClient: {} }],
  ...['site.miner-command', 'site.miner-pools'].flatMap((id) => [
    [id, 'ERR_DEVICE_NOT_FOUND', null, { mdkClient: rejected('ERR_DEVICE_NOT_FOUND') }],
    [id, 'ERR_WORKER_NOT_ROUTABLE', null, { mdkClient: rejected('ERR_WORKER_NOT_ROUTABLE') }],
    [id, 'ERR_COMMAND_REJECTED', null, { mdkClient: rejected() }]
  ])
]

// Inputs the request validation stops before the controller runs, so the
// controller's own check for them never reaches a caller.
const PRE_EMPTED = [
  ['site.history', 'ERR_UNKNOWN_METRIC', GET('/site/history?metric=nope')],
  ['site.miner-command', 'ERR_INVALID_POWER_MODE', POST('/site/miners/M-1/command', { mode: 'turbo' })],
  ['site.miner-pools', 'ERR_INVALID_POOLS', POST('/site/miners/M-1/pools', { pools: [pool, pool, pool, pool] })],
  ['site.miner-pools', 'ERR_INVALID_POOLS', POST('/site/miners/M-1/pools', { pools: [{}] })]
]

const declaredStatus = (route, code) => {
  for (const [status, response] of Object.entries(route.http.responses || {})) {
    if ((response['x-mdk-errors'] || []).some((e) => e.code === code)) return Number(status)
  }
  return undefined
}

// One Fastify per case: the route's own validation, then the controller with
// that case's ctx, answering the app runtime's status and code.
async function send (id, request, ctx, extra) {
  const route = normalizeRoute(table.routes.find((r) => r.id === id))
  const app = Fastify()
  let reached = false
  app.route({
    method: route.method,
    url: route.path.replace(/\{(\w+)\}/g, ':$1'),
    schema: route.schema,
    handler: async (req, rep) => {
      reached = true
      try {
        return await controller(id)({ query: req.query, params: req.params, body: req.body, ...extra }, ctx)
      } catch (err) {
        const res = toErrorResponse(err)
        return rep.status(res.status).send({ code: res.code })
      }
    }
  })
  const res = await app.inject(request)
  await app.close()
  return { reached, status: res.statusCode, code: res.json().code }
}

test('site errors - every declared code names its status, in both lists', async (t) => {
  for (const route of table.routes) {
    const withStatus = Object.values(route.http.responses).flatMap((r) => (r['x-mdk-errors'] || []).map((e) => e.code))
    t.alike([...withStatus].sort(), [...(route.errors || [])].sort(), `${route.id}: errors[] matches x-mdk-errors`)
  }
})

test('site errors - every declared code is raised by a case', async (t) => {
  const covered = new Set(CASES.map(([id, code]) => `${id} ${code}`))
  for (const route of table.routes) {
    for (const code of route.errors || []) t.ok(covered.has(`${route.id} ${code}`), `${route.id} ${code}`)
  }
})

test('site errors - each code reaches a caller with its declared status', async (t) => {
  for (const [id, code, request, ctx, extra] of CASES) {
    const route = table.routes.find((r) => r.id === id)
    const res = await send(id, request || REQUEST[id], ctx, extra || {})
    t.ok(res.reached, `${id} ${code}: passes request validation`)
    t.is(res.code, code, `${id} raises ${code}`)
    t.ok((route.errors || []).includes(code), `${id} declares ${code}`)
    t.is(res.status, declaredStatus(route, code), `${id} ${code} status`)
  }
})

test('site errors - request validation stops these inputs before the controller', async (t) => {
  for (const [id, code, request] of PRE_EMPTED) {
    const res = await send(id, request, { mdkClient: {} }, {})
    t.absent(res.reached, `${id}: the ${code} input is refused by validation`)
    t.is(res.status, 400)
  }
})

test('site errors - every declared code has a reason and a fix', async (t) => {
  for (const route of table.routes) {
    for (const [status, response] of Object.entries(route.http.responses)) {
      for (const e of response['x-mdk-errors'] || []) {
        t.ok(e.description, `${route.id} ${status} ${e.code} has a reason`)
        t.ok(e.fix, `${route.id} ${status} ${e.code} has a fix`)
      }
    }
  }
})
