'use strict'

const path = require('path')
const { test } = require('brittle')
const BitdeerManager = require('../../lib/bitdeer.manager')

const pkgRoot = path.join(__dirname, '../..')

test('BitdeerManager getThingType returns container-bd', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  t.is(mgr.getThingType(), 'container-bd', 'getThingType is container-bd')
})

test('BitdeerManager getThingTags returns [bitdeer]', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  t.alike(mgr.getThingTags(), ['bitdeer'], 'getThingTags is [bitdeer]')
})

test('BitdeerManager getSpecTags returns [container]', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  t.alike(mgr.getSpecTags(), ['container'], 'getSpecTags is [container]')
})

test('BitdeerManager selectThingInfo returns containerId', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  const thg = { opts: { containerId: 'C024_D40' } }
  const info = mgr.selectThingInfo(thg)
  t.alike(info, { containerId: 'C024_D40' }, 'selectThingInfo returns containerId')
})

test('BitdeerManager selectThingInfo handles missing opts', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  const info = mgr.selectThingInfo({})
  t.ok(info, 'returns object')
  t.is(info.containerId, undefined, 'containerId undefined')
})

test('BitdeerManager _connectThing returns 0 when containerId missing', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  mgr.mqtt_m0 = { aedes: {} }
  const thg = { opts: { type: 'm56' } }
  const result = await mgr._connectThing(thg, 'm56')
  t.is(result, 0, 'returns 0')
})

test('BitdeerManager _connectThing returns 0 when aedes missing', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new BitdeerManager({}, ctx)
  mgr.mqtt_m0 = { aedes: null }
  const thg = { opts: { containerId: 'C1' } }
  const result = await mgr._connectThing(thg, 'm56')
  t.is(result, 0, 'returns 0')
})

test('BitdeerManager init sets mqtt_m0 and whitelists actions', async (t) => {
  let whitelistActions = null
  const emptyAsyncIterable = {
    [Symbol.asyncIterator]: async function * () {}
  }
  const ctx = {
    rack: 'test-rack',
    mqttPort: 19983,
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
      miningosThgWriteCalls_0: {
        whitelistActions: (actions) => {
          whitelistActions = actions
        }
      }
    }
  }
  const mgr = new BitdeerManager({}, ctx)
  await mgr.init()
  t.teardown(() => {
    if (mgr.mqtt_m0 && mgr.mqtt_m0.server && typeof mgr.mqtt_m0.server.close === 'function') {
      mgr.mqtt_m0.server.close()
    }
    if (mgr.mqtt_m0 && mgr.mqtt_m0.aedes && typeof mgr.mqtt_m0.aedes.close === 'function') {
      mgr.mqtt_m0.aedes.close()
    }
  })
  t.ok(mgr.mqtt_m0, 'mqtt_m0 set')
  t.ok(Array.isArray(whitelistActions), 'whitelistActions called with array')
  t.ok(whitelistActions.length >= 4, 'at least 4 whitelisted actions')
  t.ok(whitelistActions.some(a => a[0] === 'setTankEnabled'), 'setTankEnabled whitelisted')
  t.ok(whitelistActions.some(a => a[0] === 'resetAlarm'), 'resetAlarm whitelisted')
})
