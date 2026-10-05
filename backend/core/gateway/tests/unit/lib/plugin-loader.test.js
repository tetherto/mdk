'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { loadPlugin } = require('../../../workers/lib/plugin-loader')
const { buildFastifyRoutes, errorResponse } = require('../../../workers/lib/plugin-adapter')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-plugin-loader-test-' + Date.now())

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
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
  const routes = buildFastifyRoutes(plugin, mockCtx)

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
    status (code) { sent.push(code); return this },
    send (data) { sent.push(data); return this }
  }
  const mockCtx = { noAuth: true, conf: {}, lru_30s: { get: () => undefined, set: () => {} }, queuedRequests: new Map() }

  const routes = buildFastifyRoutes(plugin, mockCtx)
  const mockReq = { params: {}, query: { x: '42' }, body: {}, headers: {}, _info: {} }
  await routes[0].handler(mockReq, mockRep)

  t.is(sent[0], 200, 'should send 200')
  t.is(sent[1].value, '42', 'should send controller result')
  t.pass()
})

test('buildFastifyRoutes - no onRequest when auth is false', (t) => {
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
  const routes = buildFastifyRoutes(plugin, mockCtx)

  t.absent(routes[0].onRequest, 'should not have onRequest when auth is false')
  t.pass()
})

test('buildFastifyRoutes - no onRequest even when auth is true (auth flags are ignored)', (t) => {
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
  const routes = buildFastifyRoutes(plugin, mockCtx)

  t.absent(routes[0].onRequest, 'adapter never attaches onRequest')
  t.pass()
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
  const mockRep = { status () { return this }, send () { return this } }
  const routes = buildFastifyRoutes(plugin, mockCtx)

  const mockReq = { params: {}, query: { start: 100, end: 200 }, body: {}, headers: {}, _info: {} }
  await routes[0].handler(mockReq, mockRep)

  const expectedKey = 'test.cached:100:200'
  t.ok(cache.has(expectedKey), 'should cache with route id + extracted fields as key')
  t.pass()
})

test('buildFastifyRoutes - overwriteCache needs an Authorization header and the value true', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'overwrite')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.overwrite', method: 'GET', path: '/test/overwrite', handler: './controllers/fresh.js', cache: ['query.k'] }]
    },
    'controllers/fresh.js': '\'use strict\'\nmodule.exports = async function () { return { fresh: true } }'
  })

  const cache = new Map([['test.overwrite:a', { fresh: false }]])
  const mockCtx = {
    conf: { cacheTiming: {} },
    lru_30s: { get (k) { return cache.get(k) }, set (k, v) { cache.set(k, v) } },
    queuedRequests: new Map()
  }
  const mockRep = { status () { return this }, send () { return this } }
  const [route] = buildFastifyRoutes(loadPlugin(dir), mockCtx)
  const call = (overwriteCache, headers) => route.handler({ params: {}, query: { k: 'a', overwriteCache }, body: {}, headers, _info: {} }, mockRep)

  await call(true, {})
  t.is(cache.get('test.overwrite:a').fresh, false, 'ignored without an Authorization header')

  await call('false', { authorization: 'Bearer x' })
  t.is(cache.get('test.overwrite:a').fresh, false, 'the string false does not bypass the cache')

  await call('true', { authorization: 'Bearer x' })
  t.is(cache.get('test.overwrite:a').fresh, true, 'refreshed with an Authorization header')
})

function makeRawRes () {
  return {
    headersSent: false,
    writableEnded: false,
    chunks: [],
    head: null,
    writeHead (status, headers) { this.headersSent = true; this.head = { status, headers } },
    write (chunk) { this.headersSent = true; this.chunks.push(chunk); return true },
    end (chunk) { if (chunk) this.chunks.push(chunk); this.writableEnded = true },
    on () {},
    once () {},
    removeListener () {}
  }
}

test('buildFastifyRoutes - stream route hijacks and hands the handler the raw reply', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'stream')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.stream', method: 'POST', path: '/stream', handler: './controllers/stream.js', auth: false, stream: true }]
    },
    'controllers/stream.js': '\'use strict\'\nmodule.exports = async function (req, res) { res.writeHead(200, { \'content-type\': \'text/event-stream\' }); res.write(\'event: token\\ndata: {"q":"\' + req.query.x + \'"}\\n\\n\'); res.end() }'
  })

  const plugin = loadPlugin(dir)
  const routes = buildFastifyRoutes(plugin, { conf: {}, queuedRequests: new Map() })

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
  const dir = path.join(FIXTURES_DIR, 'stream-throw')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.stream', method: 'POST', path: '/stream', handler: './controllers/stream.js', auth: false, stream: true }]
    },
    'controllers/stream.js': '\'use strict\'\nmodule.exports = async function () { throw Object.assign(new Error(\'ERR_AGENT_SESSION_NOT_FOUND\'), { statusCode: 404 }) }'
  })

  const plugin = loadPlugin(dir)
  const routes = buildFastifyRoutes(plugin, { conf: {}, queuedRequests: new Map() })

  const raw = makeRawRes()
  await routes[0].handler({ params: {}, query: {}, body: {}, headers: {}, _info: {} }, { raw, hijack () {} })

  t.is(raw.head.status, 404, 'statusCode carried through')
  t.ok(raw.chunks[0].includes('ERR_AGENT_SESSION_NOT_FOUND'), 'safe error message forwarded')
  t.ok(raw.writableEnded, 'reply ended')
  t.pass()
})

test('buildFastifyRoutes - stream route ends the socket on a mid-stream throw', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'stream-mid-throw')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/p',
      version: '1.0.0',
      routes: [{ id: 'test.stream', method: 'POST', path: '/stream', handler: './controllers/stream.js', auth: false, stream: true }]
    },
    'controllers/stream.js': '\'use strict\'\nmodule.exports = async function (req, res) { res.write(\'event: token\\n\\n\'); throw new Error(\'boom\') }'
  })

  const plugin = loadPlugin(dir)
  const routes = buildFastifyRoutes(plugin, { conf: {}, queuedRequests: new Map() })

  const raw = makeRawRes()
  await routes[0].handler({ params: {}, query: {}, body: {}, headers: {}, _info: {} }, { raw, hijack () {} })

  t.is(raw.chunks.length, 1, 'no error body after headers were sent')
  t.ok(raw.writableEnded, 'socket was ended, not left hanging')
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
  t.alike(logged, ['ENOENT: /srv/secret.json', 'pool exhausted'], 'only masked errors are logged')
})
