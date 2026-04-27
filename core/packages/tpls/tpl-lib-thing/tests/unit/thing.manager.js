'use strict'

const test = require('brittle')
const ThingManager = require('../../lib/thing.manager.js')

function createThingManager (conf, ctx) {
  return new ThingManager(conf, ctx)
}

test('ThingManager constructor requires rack in ctx', (t) => {
  t.exception(() => createThingManager({}, {}), 'ERR_PROC_RACK_UNDEFINED')
})

test('ThingManager constructor with rack', (t) => {
  const tm = createThingManager({}, { rack: 'test' })
  t.is(tm.prefix, 'thing-test', 'prefix set')
  t.is(tm.getThingType(), 'thing', 'getThingType')
})

test('ThingManager constructor uses ctx.wtype when provided', (t) => {
  const tm = createThingManager({}, { rack: 'r1', wtype: 'miner' })
  t.is(tm.prefix, 'miner-r1')
  t.is(tm.wtype, 'miner')
})

test('ThingManager constructor defaults wtype to thing', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.is(tm.wtype, 'thing')
})

test('collectThingSnap throws ERR_IMPL_UNKNOWN in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.exception(() => tm.collectThingSnap({}), /ERR_IMPL_UNKNOWN/)
})

test('tailLogHook0 is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.tailLogHook0())
})

test('collectSnapsHook0 is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.collectSnapsHook0())
})

test('_validateUpdateThing is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm._validateUpdateThing({}))
})

test('connectThing is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.connectThing({}))
})

test('releaseIpThing is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.releaseIpThing({}))
})

test('registerThingHook0 is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.registerThingHook0({}))
})

test('forgetThingHook0 is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.forgetThingHook0({}))
})

test('setupThingHook0 is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.setupThingHook0({}))
})

test('setupThingHook1 is a no-op in base class', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.execution(() => tm.setupThingHook1({}))
})

test('getThingTags returns empty array by default', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.alike(tm.getThingTags(), [])
})

test('getSpecTags delegates to getThingTags by default', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.alike(tm.getSpecTags(), tm.getThingTags())
})

test('selectThingInfo returns empty object by default', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.alike(tm.selectThingInfo(), {})
})

test('_getThingBaseType returns first segment of getThingType()', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.is(tm._getThingBaseType(), 'thing')
})

test('ThingManager uses ctx.loadConf when provided', (t) => {
  const calls = []
  const tm = createThingManager({}, {
    rack: 'r1',
    loadConf: (c) => { calls.push(c) }
  })
  tm.loadConf('base.thing')
  t.alike(calls, ['base.thing'])
})

test('ThingManager uses ctx.loadLib when provided', (t) => {
  const tm = createThingManager({}, {
    rack: 'r1',
    loadLib: (name) => ({ name })
  })
  t.is(tm.loadLib('stats').name, 'stats')
})

test('ThingManager loadLib defaults to returning null', (t) => {
  const tm = createThingManager({}, { rack: 'r1' })
  t.is(tm.loadLib('anything'), null)
})
