'use strict'

// Real-worker contract test: boots the actual WM_M56S worker (from
// backend/workers) against the Whatsminer mock device server and asserts the
// telemetry shape the site plugin reads, plus single-device command targeting
// against the real manager + filter stack (the query the adapter sends).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')

const WORKERS = path.join(__dirname, '..', '..', '..', '..', 'backend', 'workers')
const { WM_M56S } = require(path.join(WORKERS, 'miners', 'whatsminer'))
const wmMock = require(path.join(WORKERS, 'miners', 'whatsminer', 'mock', 'server'))
const PKG = path.join(WORKERS, 'miners', 'whatsminer')
const COMMON = path.join(WORKERS, 'base', 'config', 'common.json.example')

function makeManager (root) {
  const cfg = path.join(root, 'config')
  fs.mkdirSync(cfg, { recursive: true })
  const base = JSON.parse(fs.readFileSync(path.join(PKG, 'config', 'base.thing.json.example'), 'utf8'))
  fs.writeFileSync(path.join(cfg, 'base.thing.json'), JSON.stringify({ ...base, collectSnapsItvMs: 1000, storeSnapItvMs: 1000 }))
  fs.copyFileSync(COMMON, path.join(cfg, 'common.json'))
  return new WM_M56S({}, { rack: 'test', storeDir: path.join(root, 'store'), root, wtype: 'wrk-thing' })
}

test('real whatsminer worker serves the telemetry the site plugin reads', async (t) => {
  const port = 14310
  const mock = wmMock.createServer({ host: '127.0.0.1', port, type: 'm56s', serial: 'WM-T1', password: 'admin' })
  t.teardown(() => { try { mock.exit() } catch {} })

  const root = path.join(os.tmpdir(), `wm-contract-${Date.now()}-${process.pid}`)
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))
  const m = makeManager(root)
  await m.init()
  t.teardown(() => new Promise((resolve) => m.stop(() => resolve())))

  await m.registerThing({ id: 'miner-0', info: { container: 'c1', pos: '1_1' }, opts: { address: '127.0.0.1', port, password: 'admin' } })

  const snap = await m.collectThingSnap(m.mem.things['miner-0'])
  t.is(snap.success, true, 'snap collected from the mock')
  t.ok(typeof snap.stats.status === 'string', 'stats.status present')
  t.ok(snap.stats.power_w >= 0, 'stats.power_w present')
  t.ok(snap.stats.hashrate_mhs && typeof snap.stats.hashrate_mhs.t_5m === 'number', 'hashrate_mhs.t_5m present')
  t.ok(snap.stats.temperature_c && typeof snap.stats.temperature_c.avg === 'number', 'temperature_c.avg present')
  t.ok(typeof snap.config.power_mode === 'string', 'config.power_mode present')
})

test('setPowerMode targets only the addressed miner', async (t) => {
  const mockA = wmMock.createServer({ host: '127.0.0.1', port: 14311, type: 'm56s', serial: 'WM-A', password: 'admin' })
  const mockB = wmMock.createServer({ host: '127.0.0.1', port: 14312, type: 'm56s', serial: 'WM-B', password: 'admin' })
  t.teardown(() => { try { mockA.exit() } catch {}; try { mockB.exit() } catch {} })

  const root = path.join(os.tmpdir(), `wm-target-${Date.now()}-${process.pid}`)
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))
  const m = makeManager(root)
  await m.init()
  t.teardown(() => new Promise((resolve) => m.stop(() => resolve())))

  await m.registerThing({ id: 'miner-a', info: {}, opts: { address: '127.0.0.1', port: 14311, password: 'admin' } })
  await m.registerThing({ id: 'miner-b', info: {}, opts: { address: '127.0.0.1', port: 14312, password: 'admin' } })

  // Mirror the adapter: applyThings filters via req.query, so a single-device
  // command must carry the id query — otherwise it broadcasts.
  const applied = await m.applyThings({ method: 'setPowerMode', params: ['high'], thingIds: ['miner-a'], query: { id: { $in: ['miner-a'] } } })
  t.is(applied, 1, 'applied to exactly one miner')

  const a = await m.collectThingSnap(m.mem.things['miner-a'])
  const b = await m.collectThingSnap(m.mem.things['miner-b'])
  t.is(a.config.power_mode, 'high', 'addressed miner switched to high')
  t.is(b.config.power_mode, 'normal', 'sibling miner unchanged')
})
