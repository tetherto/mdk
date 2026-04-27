'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ElectricityManager = require('../../lib/electricity.manager.js')
const index = require('../../index.js')

test('index exports ELECTRICITY constructor', (t) => {
  t.is(index.ELECTRICITY, ElectricityManager)
})

test('constructor requires ctx.rack', (t) => {
  t.exception(() => {
    const m = new ElectricityManager({}, {})
    return m
  }, /ERR_PROC_RACK_UNDEFINED/)
  t.exception(() => {
    const m = new ElectricityManager({}, { rack: null })
    return m
  }, /ERR_PROC_RACK_UNDEFINED/)
})

test('constructor sets prefix from wtype and rack', (t) => {
  const m = new ElectricityManager({ wtype: 'wrk' }, { rack: 'rack-a' })
  t.is(m.prefix, 'wrk-rack-a')
})

test('getHttpUrl returns conf.baseUrl', (t) => {
  const m = new ElectricityManager(
    { wtype: 'w', baseUrl: 'https://api.example' },
    { rack: 'r1' }
  )
  t.is(m.getHttpUrl(), 'https://api.example')
})

test('_projection returns all documents when criteria is empty', (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  const rows = [{ id: 1, n: 10 }, { id: 2, n: 20 }]
  const out = m._projection(rows, {})
  t.alike(out, rows)
})

test('_defaultLoadConf merges JSON from config/<name>.json when present', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elec-conf-'))
  const confDir = path.join(dir, 'config')
  fs.mkdirSync(confDir)
  const file = path.join(confDir, 'myprovider.json')
  fs.writeFileSync(file, JSON.stringify({ baseUrl: 'http://local', extra: 1 }))
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1', root: dir })
  m._defaultLoadConf('myprovider')
  t.is(m.conf.baseUrl, 'http://local')
  t.is(m.conf.extra, 1)
})

test('_defaultLoadConf with group nests under group key', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elec-conf-'))
  const confDir = path.join(dir, 'config')
  fs.mkdirSync(confDir)
  fs.writeFileSync(
    path.join(confDir, 'p.json'),
    JSON.stringify({ baseUrl: 'http://nested' })
  )
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1', root: dir })
  m._defaultLoadConf('p', 'grp')
  t.is(m.conf.grp.baseUrl, 'http://nested')
})

test('getWrkExtData rejects missing query', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  await t.exception(async () => m.getWrkExtData({}), /ERR_QUERY_INVALID/)
})

test('getWrkExtData rejects missing key', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  await t.exception(
    async () => m.getWrkExtData({ query: {} }),
    /ERR_KEY_INVALID/
  )
})

test('getWrkExtData reads this.data for unknown keys', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  m.data.hashrate = 42
  const v = await m.getWrkExtData({ query: { key: 'hashrate' } })
  t.is(v, 42)
})

test('getWrkExtData margin uses getWrkSettings when patched', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  m.getWrkSettings = async () => ({ margin: 7 })
  const v = await m.getWrkExtData({ query: { key: 'margin' } })
  t.is(v, 7)
})

test('stop invokes callback immediately when facilities are not owned', (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  let called = false
  m.stop(() => {
    called = true
  })
  t.ok(called)
})

test('_defaultLoadConf is a no-op when config file is missing', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elec-conf-'))
  const m = new ElectricityManager({ wtype: 'w', baseUrl: 'http://keep' }, { rack: 'r1', root: dir })
  m._defaultLoadConf('nonexistent-provider')
  t.is(m.conf.baseUrl, 'http://keep')
})

test('constructor uses ctx.loadConf when provided', (t) => {
  let calls = 0
  const loadConf = (c, group) => {
    calls++
    t.is(c, 'a')
    t.is(group, 'a')
  }
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1', loadConf })
  m.loadConf('a', 'a')
  t.is(calls, 1)
})

test('constructor uses ctx.debugError when provided', (t) => {
  const logs = []
  const debugError = (...args) => logs.push(args)
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1', debugError })
  m.debugError('x', new Error('y'))
  t.is(logs.length, 1)
  t.is(logs[0][0], 'x')
})

test('constructor allows null conf', (t) => {
  const m = new ElectricityManager(null, { rack: 'r1' })
  t.ok(m.conf)
  t.is(m.wtype, undefined)
})

test('getWrkExtData dispatches known keys to handlers', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  m.getWrkSettings = async () => ({})
  const keys = [
    'revenue-estimates',
    'spot-price',
    'stats',
    'cost-revenue',
    'stats-history'
  ]
  for (const key of keys) {
    const v = await m.getWrkExtData({ query: { key } })
    t.is(v, undefined, key)
  }
})

test('getWrkExtData margin returns 0 when getWrkSettings has no margin', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  m.getWrkSettings = async () => ({})
  const v = await m.getWrkExtData({ query: { key: 'margin' } })
  t.is(v, 0)
})

test('_bindProcessExit registers signal handlers', (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  const before = process.listenerCount('SIGINT') + process.listenerCount('SIGTERM')
  m._bindProcessExit()
  const after = process.listenerCount('SIGINT') + process.listenerCount('SIGTERM')
  t.is(after, before + 2)
  process.removeAllListeners('SIGINT')
  process.removeAllListeners('SIGTERM')
})

test('_startFacility rejects when start returns error', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  const bad = {
    start (cb) {
      cb(new Error('start failed'))
    }
  }
  await t.exception(async () => m._startFacility(bad), /start failed/)
})

test('stop walks facilities and skips missing stop', async (t) => {
  const m = new ElectricityManager({ wtype: 'w' }, { rack: 'r1' })
  m._ownsFacilities = true
  m._initialized = true
  m.scheduler_0 = {}
  m.store_s1 = { stop: (cb) => cb() }
  m.http_0 = { stop: (cb) => cb() }
  await new Promise((resolve, reject) => {
    m.stop((err) => (err ? reject(err) : resolve()))
  })
  t.pass('stop finished')
})

test('stop logs via debugError when a facility stop passes an error', async (t) => {
  const logs = []
  const m = new ElectricityManager({ wtype: 'w' }, {
    rack: 'r1',
    debugError: (code, err) => logs.push(code, err && err.message)
  })
  m._ownsFacilities = true
  m._initialized = true
  m.scheduler_0 = { stop: (cb) => cb(new Error('fac-err')) }
  m.store_s1 = { stop: (cb) => cb() }
  m.http_0 = { stop: (cb) => cb() }
  await new Promise((resolve, reject) => {
    m.stop((err) => (err ? reject(err) : resolve()))
  })
  t.ok(logs.includes('ERR_FAC_STOP'))
  t.ok(logs.includes('fac-err'))
})
