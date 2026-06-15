'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')
const SatecPowerMeterManager = require('../../lib/satec.powermeter.manager')
const mockServer = require('../../mock/server')

const HOST = '127.0.0.1'
const PORT = 5020
const UNIT_ID = 0

const stopManager = (manager) => {
  return new Promise((resolve) => {
    manager.stop(() => resolve())
  })
}

test('registerThing and collectSnaps works end-to-end with mock server', async (t) => {
  let manager = null
  let mock = null
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'satec-powermeter-test-'))

  try {
    mock = mockServer.createServer({
      host: HOST,
      port: PORT,
      type: 'pm180'
    })

    await sleep(300)

    manager = new SatecPowerMeterManager({
      thing: {
        collectSnapsItvMs: 1000,
        collectSnapTimeoutMs: 5000,
        storeSnapItvMs: 1000,
        thingQueryConcurrency: 1
      }
    }, {
      rack: 'rack-itest',
      storeDir,
      root: process.cwd()
    })

    await manager.init()
    manager.active = true

    const registerRes = await manager.registerThing({
      info: { serialNum: 'PM180-IT-1', pos: 'site' },
      opts: {
        address: HOST,
        port: PORT,
        unitId: UNIT_ID
      }
    })

    t.is(registerRes, 1, 'registerThing should succeed')

    const things = Object.values(manager.mem.things)
    t.is(things.length, 1, 'one thing should be present after registration')

    await manager.collectSnaps()

    const thg = things[0]
    t.ok(thg.last?.snap, 'snap should exist after collection')
    t.is(thg.last.snap.success, true)
    t.ok(thg.last.snap.stats.power_w > 0, 'snap power should be positive')
    t.ok(thg.last.snap.stats.tension_v > 0, 'snap tension should be positive')
    t.ok(thg.last.snap.stats.powermeter_specific, 'powermeter specific stats should be populated')
  } finally {
    if (manager?.mem?.things) {
      for (const thg of Object.values(manager.mem.things)) {
        if (thg.ctrl && typeof thg.ctrl.close === 'function') {
          thg.ctrl.close()
        }
      }
    }

    if (manager) {
      await stopManager(manager)
    }

    if (mock) {
      mock.stop()
    }

    fs.rmSync(storeDir, { recursive: true, force: true })
  }
})
