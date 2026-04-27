'use strict'

const path = require('path')
const { test } = require('brittle')
const { createServer } = require('../../mock/server')
const Antspace = require('../../lib/antspace')
const AntspaceHydro = require('../../lib/antspace.hydro')
const AntspaceImmersion = require('../../lib/antspace.immersion')
const AnstspaceManager = require('../../lib/antspace.manager')
const libAlerts = require('../../lib/templates/alerts')
const libStats = require('../../lib/templates/stats')

const pkgRoot = path.join(__dirname, '../..')
const MOCK_HOST = '127.0.0.1'
const MOCK_PORT_HYDRO = 48100
const MOCK_PORT_IMMERSION = 48110

function createHttpClient () {
  return {
    get: async (url, opts) => {
      const u = new URL(url)
      if (opts?.qs) u.search = new URLSearchParams(opts.qs).toString()
      const res = await fetch(u.toString())
      const body = await res.json()
      return { body }
    },
    request: async (url, opts) => {
      const u = new URL(url)
      if (opts?.qs) u.search = new URLSearchParams(opts.qs).toString()
      const res = await fetch(u.toString())
      const body = await res.json()
      return { body }
    }
  }
}

test('package exports Antspace, AntspaceHydro, AntspaceImmersion, AnstspaceManager', (t) => {
  t.ok(typeof Antspace === 'function', 'Antspace is constructor')
  t.ok(typeof AntspaceHydro === 'function', 'AntspaceHydro is constructor')
  t.ok(typeof AntspaceImmersion === 'function', 'AntspaceImmersion is constructor')
  t.ok(typeof AnstspaceManager === 'function', 'AnstspaceManager is constructor')
})

test('Antspace and AnstspaceManager type alignment', (t) => {
  const ctx = { rack: 'test-rack' }
  const manager = new AnstspaceManager({}, ctx)
  const client = { get: async () => ({ body: { ok: true } }), request: async () => ({ body: { ok: true, params: {} } }) }
  const container = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  t.ok(manager.getThingType().endsWith('-as'), 'manager getThingType ends with -as')
  t.is(container._type, 'container', 'container _type is container')
})

test('templates load', (t) => {
  t.ok(libAlerts.specs.container !== undefined, 'alerts container spec available')
  t.ok(libAlerts.specs.container.supply_liquid_temp_low !== undefined, 'alerts supply_liquid_temp_low available')
  t.ok(libStats.specs.container !== undefined, 'stats container spec available')
  t.ok(libStats.specs.container.ops.container_specific_stats_group !== undefined, 'stats container_specific_stats_group available')
})

test('AnstspaceManager init with mocked facs completes', async (t) => {
  const emptyAsyncIterable = { [Symbol.asyncIterator]: async function * () {} }
  const ctx = {
    rack: 'integration-rack',
    storeDir: null,
    root: pkgRoot,
    facs: {
      store_s1: {
        getBee: async () => ({
          ready: async () => {},
          sub: () => ({ createReadStream: () => emptyAsyncIterable })
        })
      },
      interval_0: { add: () => {} },
      scheduler_0: { add: () => {} },
      miningosThgWriteCalls_0: { whitelistActions: () => {} }
    }
  }
  const manager = new AnstspaceManager({}, ctx)
  await manager.init()
  t.ok(manager._initialized, 'manager initialized')
  t.ok(manager.rackId && typeof manager.rackId === 'string', 'rackId set')
  t.ok(manager.http_0, 'http_0 facility created')
})

test('e2e: mock/server + AntspaceHydro getSnap returns snap', async (t) => {
  const mock = createServer({ host: MOCK_HOST, port: MOCK_PORT_HYDRO, type: 'hk3' })
  t.teardown(() => { if (mock && typeof mock.exit === 'function') mock.exit() })
  await mock.ready

  const client = createHttpClient()
  const container = new AntspaceHydro({ client, address: MOCK_HOST, port: mock.port })
  const snap = await container.getSnap()

  t.ok(snap, 'getSnap returns object')
  t.ok(snap.stats, 'snap has stats')
  t.ok(['running', 'stopped', 'error'].includes(snap.stats.status), 'stats.status is valid')
  t.is(typeof snap.stats.power_w, 'number', 'stats.power_w is number')
  t.ok(snap.stats.power_w >= 0, 'stats.power_w non-negative')
  t.ok(snap.stats.container_specific, 'stats.container_specific present')
  t.ok(snap.config?.container_specific, 'config.container_specific present')
})

test('e2e: mock/server + AntspaceImmersion getSnap returns snap', async (t) => {
  const mock = createServer({ host: MOCK_HOST, port: MOCK_PORT_IMMERSION, type: 'immersion' })
  t.teardown(() => { if (mock && typeof mock.exit === 'function') mock.exit() })
  await mock.ready

  const client = createHttpClient()
  const container = new AntspaceImmersion({ client, address: MOCK_HOST, port: mock.port })
  const snap = await container.getSnap()

  t.ok(snap, 'getSnap returns object')
  t.ok(snap.stats, 'snap has stats')
  t.ok(['running', 'stopped', 'error'].includes(snap.stats.status), 'stats.status is valid')
  t.is(typeof snap.stats.power_w, 'number', 'stats.power_w is number')
  t.ok(snap.stats.container_specific, 'stats.container_specific present')
  t.ok(snap.config?.container_specific, 'config.container_specific present')
})
