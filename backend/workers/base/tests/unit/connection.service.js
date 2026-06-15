'use strict'

const test = require('brittle')
const ConnectionService = require('../../lib/services/connection.service')

function makeSimpleLog (peekResult = null) {
  return {
    put: async () => {},
    get: async () => null,
    peek: async () => peekResult ? { value: Buffer.from(JSON.stringify(peekResult)) } : null,
    close: async () => {}
  }
}

function makeService (things = {}, opts = {}) {
  const {
    connectThing = async () => {},
    disconnectThing = async () => {},
    releaseIpThing = async () => {},
    registerThingHook0 = async () => {},
    forgetThingHook0 = async () => {},
    setupThingHook0 = async () => {},
    setupThingHook1 = async () => {},
    assignCodesToThings = async () => {},
    getBeeTimeLog = async () => makeSimpleLog(),
    releaseBeeTimeLog = async () => {},
    filterThings = () => Object.keys(things),
    thingsDbEntries = {}
  } = opts

  const thingsDb = {
    _entries: { ...thingsDbEntries },
    createReadStream: function * () {
      for (const [, val] of Object.entries(this._entries)) {
        yield { value: Buffer.from(JSON.stringify(val)) }
      }
    },
    del: async (id) => { delete thingsDb._entries[id] },
    put: async (id, val) => { thingsDb._entries[id] = JSON.parse(val.toString()) }
  }

  const svc = new ConnectionService({
    thingsDb,
    getThings: () => things,
    getBeeTimeLog,
    releaseBeeTimeLog,
    filterThings,
    assignCodesToThings,
    connectThing,
    disconnectThing,
    releaseIpThing,
    registerThingHook0,
    forgetThingHook0,
    setupThingHook0,
    setupThingHook1,
    getThingType: () => 'thing',
    debug: () => {},
    debugError: () => {}
  })

  return { svc, things, thingsDb }
}

// ---------------------------------------------------------------------------
// setupThing
// ---------------------------------------------------------------------------

test('setupThing adds thing to memory and returns 1', async (t) => {
  const { svc, things } = makeService()
  const base = { id: 'thg-1', code: 'T-0001', tags: [], opts: {}, info: {}, comments: [] }
  const result = await svc.setupThing(base)
  t.is(result, 1)
  t.ok(things['thg-1'])
  t.is(things['thg-1'].type, 'thing')
})

test('setupThing returns 0 when thing already exists in memory', async (t) => {
  const things = { 'thg-1': { id: 'thg-1' } }
  const { svc } = makeService(things)
  const base = { id: 'thg-1', code: 'T-0001', tags: [], opts: {}, info: {}, comments: [] }
  const result = await svc.setupThing(base)
  t.is(result, 0)
})

test('setupThing calls connectThing when ctrl is null after setupThingHook0', async (t) => {
  const connected = []
  const { svc } = makeService({}, {
    connectThing: async (thg) => { connected.push(thg.id) }
  })
  const base = { id: 'thg-2', code: 'T-0002', tags: [], opts: {}, info: {}, comments: [] }
  await svc.setupThing(base)
  t.alike(connected, ['thg-2'])
})

test('setupThing skips connectThing when setupThingHook0 sets ctrl', async (t) => {
  const connected = []
  const { svc } = makeService({}, {
    setupThingHook0: async (thg) => { thg.ctrl = { ping: () => 'pong' } },
    connectThing: async (thg) => { connected.push(thg.id) }
  })
  const base = { id: 'thg-3', code: 'T-0003', tags: [], opts: {}, info: {}, comments: [] }
  await svc.setupThing(base)
  t.is(connected.length, 0)
})

test('setupThing loads last snap from log when available and calls setupThingHook1', async (t) => {
  const hook1Called = []
  const snapData = { ts: 1000, snap: { success: true } }
  const { svc, things } = makeService({}, {
    getBeeTimeLog: async () => makeSimpleLog(snapData),
    setupThingHook1: async (thg) => { hook1Called.push(thg.id) }
  })
  const base = { id: 'thg-4', code: 'T-0004', tags: [], opts: {}, info: {}, comments: [] }
  await svc.setupThing(base)
  t.is(things['thg-4'].last.ts, 1000)
  t.alike(hook1Called, ['thg-4'])
})

test('setupThing sets last to empty object when log has no entry', async (t) => {
  const { svc, things } = makeService()
  const base = { id: 'thg-5', code: 'T-0005', tags: [], opts: {}, info: {}, comments: [] }
  await svc.setupThing(base)
  t.alike(things['thg-5'].last, {})
})

// ---------------------------------------------------------------------------
// forgetThings
// ---------------------------------------------------------------------------

test('forgetThings removes matching things from memory and db', async (t) => {
  const things = {
    'thg-1': { id: 'thg-1', ctrl: null },
    'thg-2': { id: 'thg-2', ctrl: null }
  }
  const { svc, thingsDb } = makeService(things, {
    filterThings: () => ['thg-1'],
    thingsDbEntries: { 'thg-1': { id: 'thg-1' }, 'thg-2': { id: 'thg-2' } }
  })
  await svc.forgetThings({ query: { id: { $in: ['thg-1'] } } })
  t.absent(things['thg-1'])
  t.ok(things['thg-2'])
  t.absent(thingsDb._entries['thg-1'])
})

test('forgetThings calls disconnectThing for each forgotten thing', async (t) => {
  const disconnected = []
  const things = { 'thg-1': { id: 'thg-1', ctrl: null } }
  const { svc } = makeService(things, {
    filterThings: () => ['thg-1'],
    disconnectThing: async (thg) => { disconnected.push(thg.id) }
  })
  await svc.forgetThings({ query: {} })
  t.alike(disconnected, ['thg-1'])
})

test('forgetThings calls ctrl.close when ctrl exists', async (t) => {
  let closed = false
  const things = { 'thg-1': { id: 'thg-1', ctrl: { close: async () => { closed = true } } } }
  const { svc } = makeService(things, { filterThings: () => ['thg-1'] })
  await svc.forgetThings({ query: {} })
  t.ok(closed)
})

test('forgetThings with req.all removes all things', async (t) => {
  const things = {
    'thg-1': { id: 'thg-1', ctrl: null },
    'thg-2': { id: 'thg-2', ctrl: null }
  }
  const { svc } = makeService(things, {
    filterThings: () => ['thg-1', 'thg-2']
  })
  await svc.forgetThings({ all: true })
  t.is(Object.keys(things).length, 0)
})

test('forgetThings returns 1', async (t) => {
  const { svc } = makeService({}, { filterThings: () => [] })
  const result = await svc.forgetThings({ query: {} })
  t.is(result, 1)
})

// ---------------------------------------------------------------------------
// reconnectThing
// ---------------------------------------------------------------------------

test('reconnectThing calls disconnectThing then connectThing', async (t) => {
  const calls = []
  const { svc } = makeService({}, {
    disconnectThing: async () => { calls.push('disconnect') },
    connectThing: async () => { calls.push('connect') }
  })
  const thg = { id: 'thg-1', ctrl: { close: async () => {} } }
  await svc.reconnectThing(thg)
  t.alike(calls, ['disconnect', 'connect'])
})

test('reconnectThing skips disconnectThing when ctrl is null', async (t) => {
  const calls = []
  const { svc } = makeService({}, {
    disconnectThing: async () => { calls.push('disconnect') },
    connectThing: async () => { calls.push('connect') }
  })
  const thg = { id: 'thg-1', ctrl: null }
  await svc.reconnectThing(thg)
  t.alike(calls, ['connect'])
})

// ---------------------------------------------------------------------------
// updateThingHook0
// ---------------------------------------------------------------------------

test('updateThingHook0 does nothing when thg or thgPrev is null', async (t) => {
  const { svc } = makeService()
  await t.execution(svc.updateThingHook0(null, null))
})

test('updateThingHook0 delegates to custom impl when provided', async (t) => {
  const called = []
  const things = {}
  const svc = new ConnectionService({
    thingsDb: { createReadStream: () => [], del: async () => {} },
    getThings: () => things,
    getBeeTimeLog: async () => makeSimpleLog(),
    releaseBeeTimeLog: async () => {},
    filterThings: () => [],
    assignCodesToThings: async () => {},
    updateThingHook0: async (thg, prev) => { called.push({ thg: thg.id, prev: prev.id }) },
    getThingType: () => 'thing',
    debug: () => {},
    debugError: () => {}
  })
  await svc.updateThingHook0({ id: 'a', info: {} }, { id: 'b', info: {} })
  t.alike(called, [{ thg: 'a', prev: 'b' }])
})
