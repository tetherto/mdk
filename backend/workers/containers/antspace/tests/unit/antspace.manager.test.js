'use strict'

const path = require('path')
const { test } = require('brittle')
const AnstspaceManager = require('../../lib/antspace.manager')

const pkgRoot = path.join(__dirname, '../..')

test('AntspaceManager getThingType returns container-as suffix', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new AnstspaceManager({}, ctx)
  t.ok(mgr.getThingType().endsWith('-as'), 'getThingType ends with -as')
})

test('AntspaceManager getThingTags returns [antspace]', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new AnstspaceManager({}, ctx)
  t.alike(mgr.getThingTags(), ['antspace'], 'getThingTags is [antspace]')
})

test('AntspaceManager getSpecTags returns [container]', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new AnstspaceManager({}, ctx)
  t.alike(mgr.getSpecTags(), ['container'], 'getSpecTags is [container]')
})

test('AntspaceManager selectThingInfo returns address and port', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new AnstspaceManager({}, ctx)
  const thg = { opts: { address: '192.168.1.1', port: 8080 } }
  const info = mgr.selectThingInfo(thg)
  t.alike(info, { address: '192.168.1.1', port: 8080 }, 'selectThingInfo returns address and port')
})

test('AntspaceManager selectThingInfo handles missing opts', (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new AnstspaceManager({}, ctx)
  const info = mgr.selectThingInfo({})
  t.ok(info, 'returns object')
  t.is(info.address, undefined, 'address undefined')
  t.is(info.port, undefined, 'port undefined')
})

test('AntspaceManager connectThing throws ERR_NO_IMPL', async (t) => {
  const ctx = { rack: 'test-rack' }
  const mgr = new AnstspaceManager({}, ctx)
  await t.exception(async () => await mgr.connectThing({}), /ERR_NO_IMPL/)
})

test('AntspaceManager init sets http_0 and whitelists actions', async (t) => {
  let whitelistActions = null
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
      mdkThgWriteCalls_0: {
        whitelistActions: (actions) => {
          whitelistActions = actions
        }
      }
    }
  }
  const mgr = new AnstspaceManager({}, ctx)
  await mgr.init()
  t.ok(mgr.http_0, 'http_0 set')
  t.ok(Array.isArray(whitelistActions), 'whitelistActions called with array')
  t.is(whitelistActions.length, 2, 'two whitelisted actions')
  t.ok(whitelistActions.some(a => a[0] === 'resetCoolingSystem'), 'resetCoolingSystem whitelisted')
  t.ok(whitelistActions.some(a => a[0] === 'setLiquidSupplyTemperature'), 'setLiquidSupplyTemperature whitelisted')
})
