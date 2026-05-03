'use strict'

const path = require('path')
const { test } = require('brittle')
const MicroBTManager = require('../../lib/microbt.manager')
const { CONTAINER_TYPES } = require('../../lib/utils/constants')

const pkgRoot = path.join(__dirname, '../..')

test('MicroBTManager getThingType returns container-mbt', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  t.is(mgr.getThingType(), 'container-mbt', 'getThingType is container-mbt')
})

test('MicroBTManager getThingTags returns [microbt]', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  t.alike(mgr.getThingTags(), ['microbt'], 'getThingTags is [microbt]')
})

test('MicroBTManager getSpecTags returns [container]', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  t.alike(mgr.getSpecTags(), ['container'], 'getSpecTags is [container]')
})

test('MicroBTManager constructor requires ctx.rack', (t) => {
  t.exception(() => new MicroBTManager({}, {}), /ERR_PROC_RACK_UNDEFINED/)
})

test('MicroBTManager selectThingInfo returns address and port', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  const thg = { opts: { address: '192.168.1.1', port: 502 } }
  const info = mgr.selectThingInfo(thg)
  t.alike(info, { address: '192.168.1.1', port: 502 }, 'selectThingInfo returns address and port')
})

test('MicroBTManager selectThingInfo handles missing opts', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  const info = mgr.selectThingInfo({})
  t.ok(info, 'returns object')
  t.is(info.address, undefined, 'address undefined')
  t.is(info.port, undefined, 'port undefined')
})

test('MicroBTManager _connectThing returns 0 when address missing', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  const thg = { opts: { port: 502, username: 'u', password: 'p' } }
  const result = await mgr._connectThing(thg)
  t.is(result, 0, 'returns 0')
})

test('MicroBTManager _connectThing returns 0 when port missing', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  const thg = { opts: { address: '127.0.0.1', username: 'u', password: 'p' } }
  const result = await mgr._connectThing(thg)
  t.is(result, 0, 'returns 0')
})

test('MicroBTManager _connectThing returns 0 when username missing', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  const thg = { opts: { address: '127.0.0.1', port: 502, password: 'p' } }
  const result = await mgr._connectThing(thg)
  t.is(result, 0, 'returns 0')
})

test('MicroBTManager _connectThing returns 0 when password missing', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({}, ctx)
  const thg = { opts: { address: '127.0.0.1', port: 502, username: 'u' } }
  const result = await mgr._connectThing(thg)
  t.is(result, 0, 'returns 0')
})

test('MicroBTManager collectThingSnap delegates to thg.ctrl.getSnap', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new MicroBTManager({ thing: { container: {} } }, ctx)
  const snap = { stats: { status: 'running' } }
  const thg = { ctrl: { getSnap: async () => snap } }
  const result = await mgr.collectThingSnap(thg)
  t.is(result, snap, 'returns getSnap result')
})

test('MicroBTManager _connectThing creates ctrl when opts are complete', async (t) => {
  const emptyAsyncIterable = { [Symbol.asyncIterator]: async function * () {} }
  const ctx = {
    rack: 'test-rack',
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
      mdkThgWriteCalls_0: { whitelistActions: () => {} }
    }
  }
  const mgr = new MicroBTManager({ thing: { container: {} } }, ctx)
  await mgr.init()
  mgr.modbus_0 = {
    getClient: () => ({
      end: () => {},
      unitId: 1,
      read: async () => Buffer.alloc(8),
      write: async () => Buffer.alloc(4)
    })
  }
  const thg = { opts: { address: '127.0.0.1', port: 502, username: 'u', password: 'p' } }
  const result = await mgr._connectThing(thg, CONTAINER_TYPES.WONDERINT)
  t.is(result, 1, 'returns 1')
  t.ok(thg.ctrl, 'thg.ctrl set')
  let errorHooked = false
  mgr.debugThingError = (thgArg, err) => {
    errorHooked = true
    t.is(thgArg, thg, 'debugThingError receives thing')
    t.ok(err, 'error passed through')
  }
  thg.ctrl.emit('error', new Error('probe'))
  t.ok(errorHooked, 'container error forwards to debugThingError')
  await thg.ctrl.init()
  thg.ctrl.close()
})

test('MicroBTManager init sets modbus_0 and whitelists setCoolingFanThreshold', async (t) => {
  let whitelistActions = null
  const emptyAsyncIterable = {
    [Symbol.asyncIterator]: async function * () {}
  }
  const ctx = {
    rack: 'test-rack',
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
      mdkThgWriteCalls_0: {
        whitelistActions: (actions) => {
          whitelistActions = actions
        }
      }
    }
  }
  const mgr = new MicroBTManager({}, ctx)
  await mgr.init()
  t.ok(mgr.modbus_0, 'modbus_0 set')
  t.ok(Array.isArray(whitelistActions), 'whitelistActions called with array')
  t.is(whitelistActions.length, 1, 'one whitelisted action')
  t.alike(whitelistActions[0], ['setCoolingFanThreshold', 1], 'setCoolingFanThreshold whitelisted')
})
