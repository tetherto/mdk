'use strict'

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { WM_M56S } = require('../..')

const PKG = path.join(__dirname, '..', '..')
const COMMON = path.join(PKG, '..', '..', 'base', 'config', 'common.json.example')

function makeManager (root) {
  const cfg = path.join(root, 'config')
  fs.mkdirSync(cfg, { recursive: true })
  const base = JSON.parse(fs.readFileSync(path.join(PKG, 'config', 'base.thing.json.example'), 'utf8'))
  fs.writeFileSync(path.join(cfg, 'base.thing.json'), JSON.stringify(base))
  fs.copyFileSync(COMMON, path.join(cfg, 'common.json'))
  return new WM_M56S({}, { rack: 'test', storeDir: path.join(root, 'store'), root, wtype: 'wrk-thing' })
}

// Regression: the device transport facility (tcp_0) is created before
// super.init(), which runs setupThings() to reconnect persisted things on
// restart. If the facility were created afterwards, connectThing() would throw
// (getRPC of undefined) and every persisted device would be silently dropped.
test('persisted things reload after a restart', async (t) => {
  const root = path.join(os.tmpdir(), `wm-restart-${Date.now()}-${process.pid}`)
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))

  const m1 = makeManager(root)
  await m1.init()
  await m1.registerThing({
    id: 'miner-x',
    info: { container: 'c1' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  })
  t.is(Object.keys(m1.mem.things).length, 1, 'registered before restart')
  await new Promise((resolve) => m1.stop(() => resolve()))

  const m2 = makeManager(root)
  await m2.init()
  t.is(Object.keys(m2.mem.things).length, 1, 'reloaded after restart')
  t.ok(m2.mem.things['miner-x'], 'same device id reloaded')
  t.ok(m2.mem.things['miner-x'].ctrl, 'device reconnected (ctrl set)')
  await new Promise((resolve) => m2.stop(() => resolve()))
})
