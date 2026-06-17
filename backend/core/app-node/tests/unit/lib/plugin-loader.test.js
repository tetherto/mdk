'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { loadPlugin } = require('../../../workers/lib/plugin-loader')
const { buildFastifyRoutes } = require('../../../workers/lib/plugin-adapter')

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

test('buildFastifyRoutes - has onRequest when auth is true', (t) => {
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
  const mockCtx = { noAuth: true, conf: {}, lru_30s: { get: () => undefined, set: () => {} }, queuedRequests: new Map() }
  const routes = buildFastifyRoutes(plugin, mockCtx)

  t.is(typeof routes[0].onRequest, 'function', 'should have onRequest when auth is true')
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
