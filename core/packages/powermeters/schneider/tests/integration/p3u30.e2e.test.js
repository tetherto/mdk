'use strict'

const test = require('brittle')
const net = require('net')
const { setTimeout: sleep } = require('timers/promises')
const P3U30PowerMeterManager = require('../../lib/types/p3u30.powermeter.manager')
const srv = require('../../mock/server')
const {
  createTestRoot,
  cleanupTestRoot,
  waitForThingSnap
} = require('../helpers/test-env')

function getFreePort () {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      const port = typeof addr === 'object' && addr ? addr.port : null
      s.close(() => resolve(port))
    })
    s.on('error', reject)
  })
}

test('p3u30: mock modbus, registerThing, snap end-to-end', async (t) => {
  const host = '127.0.0.1'
  const port = await getFreePort()
  const unitId = 0

  const mock = srv.createServer({
    host,
    port,
    type: 'p3u30'
  })

  let root
  let storeDir
  let manager = null

  try {
    ;({ root, storeDir } = createTestRoot({ collectSnapsItvMs: 2000 }))
    await sleep(400)

    manager = new P3U30PowerMeterManager(
      {},
      {
        rack: 'rack-test-p3',
        storeDir,
        root
      }
    )

    await manager.init()
    manager.active = true

    await manager.registerThing({
      info: { serialNum: 'p3u30-e2e' },
      opts: { address: host, port, unitId }
    })

    const { snap } = await waitForThingSnap(
      manager,
      (s) =>
        s.success === true &&
        s.stats &&
        typeof s.stats.power_w === 'number',
      45000
    )

    t.ok(snap.success)
    t.ok(Number.isFinite(snap.stats.power_w))
  } finally {
    mock.stop()
    if (manager) {
      for (const thg of Object.values(manager.mem.things)) {
        manager.disconnectThing(thg)
      }
      await new Promise((resolve) => manager.stop(() => resolve()))
    }
    if (root) cleanupTestRoot(root)
  }
})
