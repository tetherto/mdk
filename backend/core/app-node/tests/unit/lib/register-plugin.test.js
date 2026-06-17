'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const WrkServerHttp = require('../../../workers/http.node.wrk')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-register-plugin-test-' + Date.now())

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

// registerPlugin is the per-dir unit the ctx.extraPluginDirs boot loop invokes once
// per extra plugin package. Exercised here via prototype.call to avoid booting the
// full worker (facilities, httpd). It must load the manifest and wrap each route's
// handler so the controller receives the shared services object as its second arg.

function makeFakeWrk () {
  const services = { mdkClient: { tag: 'mdk' }, dataProxy: {}, authLib: {}, conf: {} }
  return { _plugins: [], _pluginServices: services, _services: services }
}

test('registerPlugin - loads an extra plugin dir and registers its routes', (t) => {
  const dir = path.join(FIXTURES_DIR, 'site')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@example/mdk-plugin-site',
      version: '1.0.0',
      routes: [{ id: 'site.devices', method: 'GET', path: '/site/devices', handler: './controllers/devices.js', auth: false }]
    },
    'controllers/devices.js': '\'use strict\'\nmodule.exports = async function (req, services) { return { devices: [], svc: services } }'
  })

  const wrk = makeFakeWrk()
  WrkServerHttp.prototype.registerPlugin.call(wrk, dir)

  t.is(wrk._plugins.length, 1, 'plugin registered')
  t.is(wrk._plugins[0].manifest.name, '@example/mdk-plugin-site')
  t.is(wrk._plugins[0].routes[0].id, 'site.devices')
  t.is(typeof wrk._plugins[0].routes[0]._handler, 'function', 'handler wrapped')
})

test('registerPlugin - wrapped handler injects services as the second argument', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'svc')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@example/mdk-plugin-svc',
      version: '1.0.0',
      routes: [{ id: 'svc.echo', method: 'GET', path: '/svc/echo', handler: './controllers/echo.js', auth: false }]
    },
    'controllers/echo.js': '\'use strict\'\nmodule.exports = async function (req, services) { return { mdk: services.mdkClient } }'
  })

  const wrk = makeFakeWrk()
  WrkServerHttp.prototype.registerPlugin.call(wrk, dir)

  const out = await wrk._plugins[0].routes[0]._handler({ params: {}, query: {}, body: {}, headers: {} })
  t.is(out.mdk.tag, 'mdk', 'controller received the shared mdkClient via services')
})

test('registerPlugin - multiple extra dirs accumulate in order', (t) => {
  const a = path.join(FIXTURES_DIR, 'a')
  const b = path.join(FIXTURES_DIR, 'b')
  writeFixture(a, {
    'mdk-plugin.json': { name: '@example/a', version: '1.0.0', routes: [{ id: 'a.x', method: 'GET', path: '/a', handler: './c.js', auth: false }] },
    'c.js': '\'use strict\'\nmodule.exports = async () => ({})'
  })
  writeFixture(b, {
    'mdk-plugin.json': { name: '@example/b', version: '1.0.0', routes: [{ id: 'b.x', method: 'GET', path: '/b', handler: './c.js', auth: false }] },
    'c.js': '\'use strict\'\nmodule.exports = async () => ({})'
  })

  const wrk = makeFakeWrk()
  for (const dir of [a, b]) WrkServerHttp.prototype.registerPlugin.call(wrk, dir)

  t.is(wrk._plugins.length, 2, 'both extra plugins registered')
  t.is(wrk._plugins[0].manifest.name, '@example/a')
  t.is(wrk._plugins[1].manifest.name, '@example/b')
})
