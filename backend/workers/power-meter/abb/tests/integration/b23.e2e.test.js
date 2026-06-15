'use strict'

const test = require('brittle')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')

const B23PowerMeterManager = require('../../lib/types/b23.powermeter.manager')
const mockServer = require('../../mock/server')

const HOST = '127.0.0.1'
const PORT = 5020
const UNIT_ID = 0

async function stopFacility (facility) {
  if (!facility || typeof facility.stop !== 'function') return

  await Promise.race([
    new Promise(resolve => facility.stop(() => resolve())),
    sleep(1000)
  ])
}

test('B23 manager registers thing and collects end-to-end snap', async t => {
  let mock = null
  let manager = null
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powermeter-abb-'))
  const storeDir = path.join(root, 'store')
  await fs.mkdir(storeDir, { recursive: true })

  try {
    mock = mockServer.createServer({
      host: HOST,
      port: PORT,
      type: 'B23'
    })

    await sleep(500)

    manager = new B23PowerMeterManager({
      thing: {
        scheduleAddlStatConfigTfs: [],
        collectSnapsItvMs: 500,
        powermeter: {}
      }
    }, {
      rack: 'rack-e2e',
      storeDir,
      root
    })

    await manager.init()
    manager.active = true

    manager.registerThing({
      info: {
        serialNum: 'B23-E2E-1'
      },
      opts: {
        address: HOST,
        port: PORT,
        unitId: UNIT_ID
      }
    })

    const deadline = Date.now() + 15000
    let snap = null
    while (Date.now() < deadline) {
      for (const thg of Object.values(manager.mem.things || {})) {
        if (thg?.last?.snap) {
          snap = thg.last.snap
          break
        }
      }

      if (snap) break
      await sleep(500)
    }

    t.ok(snap, 'snap is collected from registered thing')
    t.is(snap.success, true)
    t.ok(snap.stats, 'snap includes stats')
    t.ok(Number.isFinite(snap.stats.power_w), 'stats.power_w is numeric')
  } finally {
    if (manager?.mem?.things) {
      for (const thg of Object.values(manager.mem.things)) {
        await manager.disconnectThing(thg)
      }
    }

    await stopFacility(manager?.interval_0)
    await stopFacility(manager?.scheduler_0)
    await stopFacility(manager?.mdkThgWriteCalls_0)
    await stopFacility(manager?.store_s1)

    if (manager) {
      manager._initialized = false
    }

    if (mock?.stop) {
      mock.stop()
    }
    await fs.rm(root, { recursive: true, force: true })
  }
})
