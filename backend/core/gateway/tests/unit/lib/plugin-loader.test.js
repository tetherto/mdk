'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const crypto = require('crypto')
const { loadPlugin } = require('../../../workers/lib/plugin-loader')
const { EventEmitter } = require('events')
const { Readable, Writable } = require('stream')
const { buildFastifyRoutes, errorResponse, resolveAppTimeout } = require('../../../workers/lib/plugin-adapter')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-plugin-loader-test-' + Date.now())

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

// `[app, client]` for buildFastifyRoutes: the plugin as app "p" mounted at "/",
// with a runtime client that answers from the plugin's own handlers.
function asApp (plugin, dir) {
  const keyFile = path.join(dir, 'runtime.key')
  fs.writeFileSync(keyFile, 'ab'.repeat(32))
  const handlers = new Map(plugin.routes.map(r => [r.id, r._handler]))
  return [{ name: 'p', mount: '/', keyFile, routes: plugin.routes }, { invoke: async (key, routeId, req, { identity } = {}) => handlers.get(routeId)({ ...req, _info: identity || {} }) }]
}

// ==================== loadPlugin ====================

test('loadPlugin - loads valid plugin', (t) => {
  const dir = path.join(FIXTURES_DIR, 'valid')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/mdk-plugin-valid',
      version: '1.0.0',
      description: 'test plugin',
      routes: [
        {
          id: 'test.hello',
          method: 'GET',
          path: '/test/hello',
          handler: './controllers/hello.js',
          auth: false
        }
      ]
    },
    'controllers/hello.js': '\'use strict\'\nmodule.exports = async function () { return { ok: true } }'
  })

  const plugin = loadPlugin(dir)
  t.is(plugin.manifest.name, '@test/mdk-plugin-valid', 'should have manifest name')
  t.is(plugin.routes.length, 1, 'should have one route')
  t.is(plugin.routes[0].id, 'test.hello', 'should have route id')
  t.is(typeof plugin.routes[0]._handler, 'function', 'should have loaded handler')
  t.pass()
})

test('loadPlugin - throws ERR_PLUGIN_MANIFEST_MISSING when no manifest', (t) => {
  const dir = path.join(FIXTURES_DIR, 'no-manifest')
  fs.mkdirSync(dir, { recursive: true })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_PLUGIN_MANIFEST_MISSING'), 'should throw ERR_PLUGIN_MANIFEST_MISSING')
  }
  t.pass()
})

test('loadPlugin - throws ERR_PLUGIN_MANIFEST_INVALID when name missing', (t) => {
  const dir = path.join(FIXTURES_DIR, 'invalid-no-name')
  writeFixture(dir, {
    'mdk-plugin.json': {
      version: '1.0.0',
      routes: [{ id: 'x', method: 'GET', path: '/x', handler: './controllers/x.js' }]
    }
  })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.includes('ERR_PLUGIN_MANIFEST_INVALID'), 'should throw ERR_PLUGIN_MANIFEST_INVALID')
    t.ok(err.message.includes('"name"'), 'should mention missing field')
  }
  t.pass()
})

test('loadPlugin - throws ERR_PLUGIN_MANIFEST_INVALID when routes empty', (t) => {
  const dir = path.join(FIXTURES_DIR, 'invalid-empty-routes')
  writeFixture(dir, {
    'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [] }
  })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.includes('ERR_PLUGIN_MANIFEST_INVALID'), 'should throw ERR_PLUGIN_MANIFEST_INVALID')
    t.ok(err.message.includes('"routes"'), 'should mention routes')
  }
  t.pass()
})

test('loadPlugin - throws ERR_PLUGIN_MANIFEST_INVALID for invalid method', (t) => {
  const dir = path.join(FIXTURES_DIR, 'invalid-method')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'x', method: 'INVALID', path: '/x', handler: './controllers/x.js' }]
    }
  })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.includes('ERR_PLUGIN_MANIFEST_INVALID'), 'should throw ERR_PLUGIN_MANIFEST_INVALID')
  }
  t.pass()
})

test('loadPlugin - throws ERR_PLUGIN_ROUTE_DUPLICATE_ID', (t) => {
  const dir = path.join(FIXTURES_DIR, 'dup-id')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [
        { id: 'same.id', method: 'GET', path: '/a', handler: './controllers/a.js' },
        { id: 'same.id', method: 'GET', path: '/b', handler: './controllers/b.js' }
      ]
    }
  })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_PLUGIN_ROUTE_DUPLICATE_ID'), 'should throw ERR_PLUGIN_ROUTE_DUPLICATE_ID')
  }
  t.pass()
})

test('loadPlugin - throws ERR_PLUGIN_HANDLER_NOT_FOUND when file missing', (t) => {
  const dir = path.join(FIXTURES_DIR, 'missing-handler')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'x', method: 'GET', path: '/x', handler: './controllers/doesnotexist.js' }]
    }
  })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_PLUGIN_HANDLER_NOT_FOUND'), 'should throw ERR_PLUGIN_HANDLER_NOT_FOUND')
  }
  t.pass()
})

test('loadPlugin - a handler that exists but cannot load is ERR_PLUGIN_HANDLER_LOAD_FAILED with the real cause', (t) => {
  const cases = [
    ['missing-dep', '\'use strict\'\nrequire(\'not-installed-anywhere\')\nmodule.exports = async () => ({})', /ERR_PLUGIN_HANDLER_LOAD_FAILED: .*route "x" handler "\.\/h\.js": Cannot find module 'not-installed-anywhere'/],
    ['throws-on-load', '\'use strict\'\nthrow new Error(\'boom at load\')', /ERR_PLUGIN_HANDLER_LOAD_FAILED: .*route "x" handler "\.\/h\.js": boom at load/]
  ]
  for (const [name, source, re] of cases) {
    const dir = path.join(FIXTURES_DIR, name)
    writeFixture(dir, { 'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 'x', method: 'GET', path: '/x', handler: './h.js' }] }, 'h.js': source })
    t.exception(() => loadPlugin(dir), re, name)
  }
})

test('loadPlugin - a route path must start with "/" and a method + path may appear once', (t) => {
  const route = (id, method, p) => ({ id, method, path: p, handler: './h.js' })
  const cases = [
    ['no-slash', [route('a', 'GET', 'api/x')], /ERR_PLUGIN_MANIFEST_INVALID: .*route "a" path "api\/x" must start with "\/"/],
    ['dup-path', [route('a', 'GET', '/x/{id}'), route('b', 'GET', '/x/:id')], /ERR_PLUGIN_ROUTE_DUPLICATE_PATH: .*route "b" repeats GET \/x\/:id/]
  ]
  for (const [name, routes, re] of cases) {
    const dir = path.join(FIXTURES_DIR, name)
    writeFixture(dir, { 'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes }, 'h.js': 'module.exports = async () => ({})' })
    t.exception(() => loadPlugin(dir), re, name)
  }
  const dir = path.join(FIXTURES_DIR, 'same-path-other-method')
  writeFixture(dir, { 'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [route('a', 'GET', '/x'), route('b', 'POST', '/x')] }, 'h.js': 'module.exports = async () => ({})' })
  t.is(loadPlugin(dir).routes.length, 2, 'the same path under another method is fine')
})

test('loadPlugin - throws ERR_PLUGIN_HANDLER_NOT_FUNCTION when handler is not a function', (t) => {
  const dir = path.join(FIXTURES_DIR, 'not-a-fn')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'x', method: 'GET', path: '/x', handler: './controllers/notfn.js' }]
    },
    'controllers/notfn.js': '\'use strict\'\nmodule.exports = { notAFunction: true }'
  })

  try {
    loadPlugin(dir)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_PLUGIN_HANDLER_NOT_FUNCTION'), 'should throw ERR_PLUGIN_HANDLER_NOT_FUNCTION')
  }
  t.pass()
})

test('loadPlugin - normalizes method to uppercase', (t) => {
  const dir = path.join(FIXTURES_DIR, 'lowercase-method')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'x', method: 'get', path: '/x', handler: './controllers/x.js' }]
    },
    'controllers/x.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })

  const plugin = loadPlugin(dir)
  t.is(plugin.routes[0].method, 'GET', 'should uppercase method')
  t.pass()
})

// ==================== buildFastifyRoutes ====================

test('buildFastifyRoutes - returns Fastify-compatible route objects', (t) => {
  const dir = path.join(FIXTURES_DIR, 'fastify-routes')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [
        { id: 'route.a', method: 'GET', path: '/test/a', handler: './controllers/a.js', auth: false },
        { id: 'route.b', method: 'POST', path: '/test/b', handler: './controllers/b.js', auth: false }
      ]
    },
    'controllers/a.js': '\'use strict\'\nmodule.exports = async function () { return { a: 1 } }',
    'controllers/b.js': '\'use strict\'\nmodule.exports = async function () { return { b: 2 } }'
  })

  const plugin = loadPlugin(dir)
  const mockCtx = { noAuth: true, conf: {}, lru_30s: { get: () => undefined, set: () => {} }, queuedRequests: new Map() }
  const routes = buildFastifyRoutes(...asApp(plugin, dir), mockCtx)

  t.is(routes.length, 2, 'should return two routes')
  t.is(routes[0].method, 'GET', 'first route method')
  t.is(routes[0].url, '/test/a', 'first route url')
  t.is(typeof routes[0].handler, 'function', 'first route has handler')
  t.is(routes[1].method, 'POST', 'second route method')
  t.pass()
})

test('buildFastifyRoutes - handler calls controller and sends 200', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'handler-calls')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.data', method: 'GET', path: '/test/data', handler: './controllers/data.js', auth: false }]
    },
    'controllers/data.js': '\'use strict\'\nmodule.exports = async function (req) { return { value: req.query.x } }'
  })

  const plugin = loadPlugin(dir)
  const sent = []
  const mockRep = {
    raw: new EventEmitter(),
    status (code) { sent.push(code); return this },
    send (data) { sent.push(data); return this }
  }
  const mockCtx = { noAuth: true, conf: {}, lru_30s: { get: () => undefined, set: () => {} }, queuedRequests: new Map() }

  const routes = buildFastifyRoutes(...asApp(plugin, dir), mockCtx)
  const mockReq = { params: {}, query: { x: '42' }, body: {}, headers: {}, _info: {} }
  await routes[0].handler(mockReq, mockRep)

  t.is(sent[0], 200, 'should send 200')
  t.is(sent[1].value, '42', 'should send controller result')
  t.pass()
})

test('buildFastifyRoutes - no auth hook when auth is false', (t) => {
  const dir = path.join(FIXTURES_DIR, 'no-auth')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.open', method: 'GET', path: '/open', handler: './controllers/open.js', auth: false }]
    },
    'controllers/open.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })

  const plugin = loadPlugin(dir)
  const mockCtx = { noAuth: true, conf: {}, lru_30s: { get: () => undefined, set: () => {} }, queuedRequests: new Map() }
  const routes = buildFastifyRoutes(...asApp(plugin, dir), mockCtx)

  t.absent(routes[0].preParsing, 'should not have an auth hook when auth is false')
  t.pass()
})

test('buildFastifyRoutes - auth: true routes get a preParsing hook that answers 401 without a verifier', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'with-auth')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.secured', method: 'GET', path: '/secure', handler: './controllers/secured.js', auth: true }]
    },
    'controllers/secured.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })

  const plugin = loadPlugin(dir)
  const mockCtx = { conf: {}, lru_30s: { get: () => undefined, set: () => {} }, queuedRequests: new Map() }
  const routes = buildFastifyRoutes(...asApp(plugin, dir), mockCtx)

  t.is(typeof routes[0].preParsing, 'function', 'auth route is guarded')
  await t.exception(() => routes[0].preParsing({ headers: {} }), /ERR_AUTH_UNAUTHORIZED/, 'closed when no verifier is configured')
})

test('buildFastifyRoutes - a verifier identity becomes the controller\'s _info', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'with-auth-verifier')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.whoami', method: 'GET', path: '/whoami', handler: './controllers/whoami.js', auth: true, permissions: ['x:r'] }]
    },
    'controllers/whoami.js': '\'use strict\'\nmodule.exports = async function (req) { return { user: req._info.user } }'
  })

  const seen = []
  const authVerifier = async (request, route) => {
    seen.push(route)
    return request.headers.authorization === 'Bearer good' ? { user: { userId: 'op-a' } } : false
  }
  const plugin = loadPlugin(dir)
  const [route] = buildFastifyRoutes(...asApp(plugin, dir), { conf: {}, queuedRequests: new Map() }, { authVerifier })

  await t.exception(() => route.preParsing({ headers: { authorization: 'Bearer bad' } }), /ERR_AUTH_UNAUTHORIZED/, 'false from the verifier is a 401')

  const req = { params: {}, query: {}, body: {}, headers: { authorization: 'Bearer good' } }
  await route.preParsing(req)
  const sent = []
  await route.handler(req, { raw: new EventEmitter(), status (c) { sent.push(c); return this }, send (d) { sent.push(d); return this } })
  t.alike(sent, [200, { user: { userId: 'op-a' } }], 'controller sees the verified identity')
  t.is(seen[0].id, 'test.whoami', 'verifier is told which route')
  t.alike(seen[0].permissions, ['x:r'], 'and the permissions the manifest declares')
})

test('buildFastifyRoutes - cache uses route id + extracted field values as key', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'cached')
  const callCount = 0
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{
        id: 'test.cached',
        method: 'GET',
        path: '/test/cached',
        handler: './controllers/cached.js',
        auth: false,
        cache: ['query.start', 'query.end']
      }]
    },
    'controllers/cached.js': `'use strict'\nmodule.exports = async function () { return { count: ${callCount} } }`
  })

  const cache = new Map()
  const mockCtx = {
    noAuth: true,
    conf: { cacheTiming: {} },
    lru_30s: {
      get (k) { return cache.get(k) },
      set (k, v) { cache.set(k, v) }
    },
    queuedRequests: new Map()
  }

  const plugin = loadPlugin(dir)
  const mockRep = { raw: new EventEmitter(), status () { return this }, send () { return this } }
  const routes = buildFastifyRoutes(...asApp(plugin, dir), mockCtx)

  const mockReq = { params: {}, query: { start: 100, end: 200 }, body: {}, headers: {}, _info: {} }
  await routes[0].handler(mockReq, mockRep)

  const expectedKey = JSON.stringify(['p', 'test.cached', 100, 200])
  t.ok(cache.has(expectedKey), 'should cache with route id + extracted fields as key')
  t.pass()
})

test('buildFastifyRoutes - overwriteCache needs a verified identity holding cache:overwrite', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'overwrite')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.overwrite', method: 'GET', path: '/test/overwrite', handler: './controllers/fresh.js', auth: true, cache: ['query.k'] }]
    },
    'controllers/fresh.js': '\'use strict\'\nmodule.exports = async function () { return { fresh: true } }'
  })

  // An auth: true route caches per identity: the key ends with a hash of it.
  const idKey = (info) => 'id:' + crypto.createHash('sha256').update(JSON.stringify(info)).digest('hex')
  const readerKey = JSON.stringify(['p', 'test.overwrite', 'a', idKey({ perms: ['x:r'] })])
  const key = JSON.stringify(['p', 'test.overwrite', 'a', idKey({ perms: ['cache:overwrite'] })])
  const stale = () => { cache.set(key, { fresh: false }); cache.set(readerKey, { fresh: false }) }
  const cache = new Map()
  const mockCtx = {
    conf: { cacheTiming: {} },
    lru_30s: { get (k) { return cache.get(k) }, set (k, v) { cache.set(k, v) } },
    queuedRequests: new Map()
  }
  const authVerifier = async (req) => ({
    'Bearer reader': { perms: ['x:r'] },
    'Bearer admin': { perms: ['cache:overwrite'] }
  })[req.headers.authorization] || false
  const mockRep = { raw: new EventEmitter(), status () { return this }, send () { return this } }
  const [route] = buildFastifyRoutes(...asApp(loadPlugin(dir), dir), mockCtx, { authVerifier })
  const call = async (overwriteCache, headers) => {
    const req = { params: {}, query: { k: 'a', overwriteCache }, body: {}, headers }
    await route.preParsing(req)
    await route.handler(req, mockRep)
  }

  stale()
  await call('true', { authorization: 'Bearer reader' })
  t.is(cache.get(readerKey).fresh, false, 'an Authorization header alone does not bypass the cache')

  await call('false', { authorization: 'Bearer admin' })
  t.is(cache.get(key).fresh, false, 'the string false does not bypass the cache')

  await call('true', { authorization: 'Bearer admin' })
  t.is(cache.get(key).fresh, true, 'refreshed for an identity holding cache:overwrite')

  stale()
  const [open] = buildFastifyRoutes(...asApp(loadPlugin(dir), dir), mockCtx)
  await open.handler({ params: {}, query: { k: 'a', overwriteCache: 'true' }, body: {}, headers: { authorization: 'Bearer admin' }, _info: { perms: ['cache:overwrite'] } }, mockRep)
  t.is(cache.get(key).fresh, false, 'an _info the verifier did not set is not trusted')
})

test('loadPlugin - http.requestBody maps to a Fastify body schema', (t) => {
  const body = { type: 'object', required: ['action'], properties: { action: { type: 'string' } } }
  const dir = path.join(FIXTURES_DIR, 'request-body')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [
        {
          id: 'test.required',
          handler: './controllers/c.js',
          http: {
            method: 'POST',
            path: '/a/{id}',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: { required: true, content: { 'application/json': { schema: body } } }
          }
        },
        {
          id: 'test.optional',
          handler: './controllers/c.js',
          http: { method: 'POST', path: '/b', requestBody: { content: { 'application/json': { schema: body } } } }
        }
      ]
    },
    'controllers/c.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })

  const [required, optional] = loadPlugin(dir).routes
  t.alike(required.schema.body, body, 'a required body is validated as declared')
  t.ok(required.schema.params, 'parameters are still mapped alongside the body')
  t.alike(optional.schema.body, { anyOf: [body, { type: 'null' }] }, 'an optional body may be omitted, but not malformed')
})

test('loadPlugin - rejects a handler outside the plugin dir', (t) => {
  for (const [name, handler] of [['up', '../outside.js'], ['abs', path.join(os.tmpdir(), 'outside.js')], ['nested-up', './controllers/../../outside.js']]) {
    const dir = path.join(FIXTURES_DIR, 'escape-' + name)
    writeFixture(dir, {
      'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 'r', method: 'GET', path: '/r', handler }] }
    })
    t.exception(() => loadPlugin(dir), /ERR_PLUGIN_HANDLER_OUTSIDE_PLUGIN/, `${handler} is refused`)
  }
})

test('loadPlugin - rejects a route path without a leading slash', (t) => {
  const dir = path.join(FIXTURES_DIR, 'path-no-slash')
  writeFixture(dir, {
    'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 'r', method: 'GET', path: 'health', handler: './c.js' }] },
    'c.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })
  t.exception(() => loadPlugin(dir), /ERR_PLUGIN_MANIFEST_INVALID.*path "health" must start with "\/"/)
})

test('buildFastifyRoutes - a route at "/" answers at the mount itself', (t) => {
  const dir = path.join(FIXTURES_DIR, 'root-route')
  writeFixture(dir, {
    'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 'r', method: 'GET', path: '/', handler: './c.js' }] },
    'c.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })
  const [app, client] = asApp(loadPlugin(dir), dir)
  const ctx = { conf: {} }
  t.is(buildFastifyRoutes({ ...app, mount: undefined }, client, ctx)[0].url, '/apps/p')
  t.is(buildFastifyRoutes(app, client, ctx)[0].url, '/', 'mounted at the root it stays "/"')
})

test('resolveAppTimeout - defaults, accepts digit strings, and fails the boot on anything else', (t) => {
  t.is(resolveAppTimeout({}), 60000)
  t.is(resolveAppTimeout({ appTimeoutMs: 2500 }), 2500)
  t.is(resolveAppTimeout({ appTimeoutMs: '2500' }), 2500)
  for (const bad of ['60s', -1, 0, 1.5, true]) {
    t.exception(() => resolveAppTimeout({ appTimeoutMs: bad }), /ERR_GATEWAY_APP_TIMEOUT_INVALID/, String(bad))
  }
})

test('loadPlugin - rejects a non-boolean auth flag', (t) => {
  const dir = path.join(FIXTURES_DIR, 'auth-string')
  writeFixture(dir, {
    'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 'r', method: 'GET', path: '/r', handler: './c.js', auth: 'true' }] },
    'c.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })
  t.exception(() => loadPlugin(dir), /ERR_PLUGIN_MANIFEST_INVALID.*auth/)
})

function makeRawRes () {
  const raw = new Writable({ write (chunk, encoding, cb) { raw.chunks.push(chunk.toString()); cb() } })
  Object.assign(raw, { chunks: [], head: null, headersSent: false })
  raw.writeHead = (status, headers) => { raw.headersSent = true; raw.head = { status, headers } }
  return raw
}

function streamApp (stream) {
  const dir = path.join(FIXTURES_DIR, 'stream')
  fs.mkdirSync(dir, { recursive: true })
  const plugin = { routes: [{ id: 'test.stream', method: 'POST', path: '/stream', stream: true }] }
  const [app] = asApp(plugin, dir)
  return buildFastifyRoutes(app, { stream }, { conf: {}, queuedRequests: new Map() })
}

test('buildFastifyRoutes - stream route hijacks and pipes the runtime stream into the raw reply', async (t) => {
  const routes = streamApp(async (key, routeId, req) => ({
    statusCode: 200,
    headers: { 'content-type': 'text/event-stream' },
    stream: Readable.from([`event: token\ndata: {"q":"${req.query.x}"}\n\n`])
  }))

  const raw = makeRawRes()
  let hijacked = false
  const mockRep = { raw, hijack () { hijacked = true } }
  await routes[0].handler({ params: {}, query: { x: '42' }, body: {}, headers: {}, _info: {} }, mockRep)

  t.ok(hijacked, 'reply was hijacked')
  t.is(raw.head.headers['content-type'], 'text/event-stream', 'handler set SSE headers on the raw reply')
  t.ok(raw.chunks[0].includes('"q":"42"'), 'handler wrote to the raw reply')
  t.ok(raw.writableEnded, 'stream ended')
  t.pass()
})

test('buildFastifyRoutes - stream route maps a pre-headers throw to a JSON error', async (t) => {
  const routes = streamApp(async () => { throw Object.assign(new Error('ERR_AGENT_SESSION_NOT_FOUND'), { statusCode: 404 }) })

  const raw = makeRawRes()
  await routes[0].handler({ params: {}, query: {}, body: {}, headers: {}, _info: {} }, { raw, hijack () {} })

  t.is(raw.head.status, 404, 'statusCode carried through')
  t.ok(raw.chunks[0].includes('ERR_AGENT_SESSION_NOT_FOUND'), 'safe error message forwarded')
  t.ok(raw.writableEnded, 'reply ended')
  t.pass()
})

test('buildFastifyRoutes - stream route tears the socket down on a mid-stream failure', async (t) => {
  const routes = streamApp(async () => {
    const stream = new Readable({ read () {} })
    stream.push('event: token\n\n')
    setImmediate(() => stream.destroy(new Error('boom')))
    return { statusCode: 200, headers: {}, stream }
  })

  const raw = makeRawRes()
  raw.on('error', () => {})
  await routes[0].handler({ params: {}, query: {}, body: {}, headers: {}, _info: {} }, { raw, hijack () {} })

  t.is(raw.chunks.length, 1, 'no error body after headers were sent')
  t.ok(raw.destroyed, 'socket was torn down, not left hanging')
  t.pass()
})

test('errorResponse - forwards ERR_* and Fastify 4xx messages, masks and logs the rest', (t) => {
  const logged = []
  const log = { error (err) { logged.push(err.message) } }

  t.alike(errorResponse(Object.assign(new Error('ERR_AGENT_TURN_ACTIVE'), { statusCode: 409 }), log), { statusCode: 409, error: 'Conflict', message: 'ERR_AGENT_TURN_ACTIVE' })
  t.alike(errorResponse(new Error('ERR_KERNEL_CLIENT_NOT_CONNECTED'), log), { statusCode: 400, error: 'Bad Request', message: 'ERR_KERNEL_CLIENT_NOT_CONNECTED' })
  t.alike(errorResponse(Object.assign(new Error('body/q must be string'), { statusCode: 400, code: 'FST_ERR_VALIDATION' }), log), { statusCode: 400, error: 'Bad Request', message: 'body/q must be string' })
  t.alike(errorResponse(new Error('ENOENT: /srv/secret.json'), log), { statusCode: 400, error: 'Bad Request', message: 'Bad Request' })
  t.alike(errorResponse(Object.assign(new Error('pool exhausted'), { statusCode: 503 }), log), { statusCode: 503, error: 'Service Unavailable', message: 'Service Unavailable' })
  t.alike(errorResponse(Object.assign(new Error('Bad Request'), { statusCode: 400, remote: true }), log), { statusCode: 400, error: 'Bad Request', message: 'Bad Request' })
  t.alike(logged, ['ENOENT: /srv/secret.json', 'pool exhausted'], 'only masked errors are logged, not ones an app runtime already handled')
})

test('buildFastifyRoutes - forwards with the verified identity and a timeout (60s, or common.json appTimeoutMs)', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'forward-opts')
  writeFixture(dir, {
    'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 't.r', method: 'GET', path: '/r', handler: './c.js' }] },
    'c.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })
  const [app] = asApp(loadPlugin(dir), dir)
  const calls = []
  const client = { invoke: async (key, routeId, req, opts) => { calls.push({ routeId, req, opts }); return {} } }
  const rep = { raw: new EventEmitter(), status () { return this }, send () { return this } }
  const req = { params: { a: 1 }, query: {}, body: null, headers: {} }

  await buildFastifyRoutes(app, client, { conf: {} })[0].handler(req, rep)
  await buildFastifyRoutes(app, client, { conf: { appTimeoutMs: 1234 } })[0].handler({ ...req, _info: { user: 'op' } }, rep)
  t.alike(calls.map(({ opts: { identity, timeoutMs } }) => ({ identity, timeoutMs })), [{ identity: {}, timeoutMs: 60000 }, { identity: { user: 'op' }, timeoutMs: 1234 }])
  t.ok(calls.every((c) => c.opts.signal instanceof AbortSignal), 'every uncached call carries an abort signal')
  t.alike(calls[0].req, { params: { a: 1 }, query: {}, body: null, headers: {} }, 'the runtime gets params, query, body and headers')

  t.is(calls[0].opts.actor, null, 'no operator token without a signed-in user')
  await buildFastifyRoutes(app, client, { conf: {} })[0].handler({ ...req, _info: { kind: 'user', sub: 'op' }, _actorToken: 'op-token' }, rep)
  t.is(calls[2].opts.actor, 'op-token', 'a signed-in operator\'s token goes beside the identity')
  t.absent(JSON.stringify(calls[2].req).includes('op-token'), 'never inside the request app code reads')
})

test('buildFastifyRoutes - credentials stay at the Gateway; a client that leaves aborts its call', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'forward-strip')
  writeFixture(dir, {
    'mdk-plugin.json': { name: '@test/p', version: '1.0.0', routes: [{ id: 't.r', method: 'GET', path: '/r', handler: './c.js' }] },
    'c.js': '\'use strict\'\nmodule.exports = async function () { return {} }'
  })
  const [app] = asApp(loadPlugin(dir), dir)
  let release
  let called
  const invoked = new Promise((resolve) => { called = resolve })
  const client = {
    invoke: (key, routeId, req, opts) => {
      called({ req, opts })
      return new Promise((resolve) => { release = resolve })
    }
  }
  const raw = new EventEmitter()
  const rep = { raw, status () { return this }, send () { return this } }
  const headers = { authorization: 'Bearer secret', 'proxy-authorization': 'Basic x', cookie: 's=1', 'x-trace': 't' }
  const pending = buildFastifyRoutes(app, client, { conf: {} })[0].handler({ params: {}, query: {}, body: null, headers }, rep)
  const seen = await invoked

  t.alike(seen.req.headers, { 'x-trace': 't' }, 'authorization, proxy-authorization and cookie are not forwarded')
  t.is(headers.authorization, 'Bearer secret', 'the Gateway request itself is untouched')
  t.absent(seen.opts.signal.aborted)
  raw.emit('close')
  t.ok(seen.opts.signal.aborted, 'the call is aborted once the client is gone')
  release({})
  await pending
})
