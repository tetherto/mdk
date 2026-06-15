'use strict'

const test = require('brittle')
const DataService = require('../../lib/services/data.service')

function makeDb (initial = {}) {
  const store = { ...initial }
  return {
    _store: store,
    get: async (id) => store[id] ? { value: Buffer.from(JSON.stringify(store[id])) } : null,
    put: async (id, val) => { store[id] = JSON.parse(val.toString()) }
  }
}

function makeService (things = {}, opts = {}) {
  const mem = { things, nextAvailableCode: null }
  const db = makeDb(opts.dbEntries || {})
  const {
    getThingType = () => 'thing',
    getThingTags = () => [],
    setupThing = async () => {},
    registerThingHook0 = async () => {},
    updateThingHook0 = async () => {},
    reconnectThing = async () => {}
  } = opts

  const svc = new DataService({
    thingsDb: db,
    getThings: () => things,
    getMem: () => mem,
    getThingType,
    getThingTags,
    setupThing,
    registerThingHook0,
    updateThingHook0,
    reconnectThing,
    validateUpdateThing: opts.validateUpdateThing || (() => {})
  })

  return { svc, things, mem, db }
}

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

test('generateId returns a non-empty string', (t) => {
  const { svc } = makeService()
  const id = svc.generateId()
  t.ok(typeof id === 'string' && id.length > 0)
})

test('generateId returns unique ids', (t) => {
  const { svc } = makeService()
  const id1 = svc.generateId()
  const id2 = svc.generateId()
  t.ok(id1 !== id2)
})

// ---------------------------------------------------------------------------
// validateRegisterThing
// ---------------------------------------------------------------------------

test('validateRegisterThing throws when thing id already exists', (t) => {
  const { svc } = makeService({ 'thg-1': { id: 'thg-1' } })
  t.exception(() => svc.validateRegisterThing({ id: 'thg-1' }), /ERR_THING_WITH_ID_ALREADY_EXISTS/)
})

test('validateRegisterThing throws when code format is invalid', (t) => {
  const { svc } = makeService()
  t.exception(() => svc.validateRegisterThing({ code: 'BADCODE' }), /ERR_THING_CODE_INVALID/)
})

test('validateRegisterThing throws when code already exists', (t) => {
  const { svc } = makeService({ 'thg-1': { id: 'thg-1', code: 'THG-0001' } })
  t.exception(() => svc.validateRegisterThing({ code: 'THG-0001' }), /ERR_THING_WITH_CODE_ALREADY_EXISTS/)
})

test('validateRegisterThing passes for new unique thing', (t) => {
  const { svc } = makeService()
  t.execution(() => svc.validateRegisterThing({ id: 'new-id', info: {} }))
})

// ---------------------------------------------------------------------------
// registerThing
// ---------------------------------------------------------------------------

test('registerThing stores thing in db and calls setupThing, returns 1', async (t) => {
  const setupCalled = []
  const { svc, db } = makeService({}, {
    setupThing: async (thg) => { setupCalled.push(thg.id) }
  })

  const result = await svc.registerThing({ id: 'thg-new', info: { name: 'Test' }, opts: {} })
  t.is(result, 1)
  t.ok(db._store['thg-new'])
  t.alike(setupCalled, ['thg-new'])
})

test('registerThing auto-generates id when not provided', async (t) => {
  const { svc, db } = makeService()
  await svc.registerThing({ info: {}, opts: {} })
  t.is(Object.keys(db._store).length, 1)
})

test('registerThing adds initial comment when comment and user are provided', async (t) => {
  const { svc, db } = makeService({}, {
    setupThing: async () => {}
  })
  await svc.registerThing({ id: 'thg-c', info: {}, opts: {}, comment: 'first', user: 'alice' })
  t.is(db._store['thg-c'].comments.length, 1)
  t.is(db._store['thg-c'].comments[0].comment, 'first')
})

test('registerThing sets createdAt and updatedAt on info', async (t) => {
  const { svc, db } = makeService({}, { setupThing: async () => {} })
  const before = Date.now()
  await svc.registerThing({ id: 'thg-ts', info: {}, opts: {} })
  const after = Date.now()
  const stored = db._store['thg-ts']
  t.ok(stored.info.createdAt >= before && stored.info.createdAt <= after)
  t.is(stored.info.createdAt, stored.info.updatedAt)
})

test('registerThing calls registerThingHook0', async (t) => {
  const hookCalled = []
  const { svc } = makeService({}, {
    setupThing: async () => {},
    registerThingHook0: async (thg) => { hookCalled.push(thg.id) }
  })
  await svc.registerThing({ id: 'thg-hook', info: {}, opts: {} })
  t.alike(hookCalled, ['thg-hook'])
})

// ---------------------------------------------------------------------------
// updateThing
// ---------------------------------------------------------------------------

test('updateThing throws ERR_THING_NOTFOUND when thing does not exist in memory', async (t) => {
  const { svc } = makeService()
  await t.exception(svc.updateThing({ id: 'missing' }), /ERR_THING_NOTFOUND/)
})

test('updateThing merges opts and info and calls reconnectThing', async (t) => {
  const reconnected = []
  const initial = { id: 'thg-1', code: 'T-0001', opts: { a: 1 }, info: { name: 'Old' }, tags: ['t-thing'], comments: [] }
  const { svc, db } = makeService(
    { 'thg-1': { ...initial } },
    {
      dbEntries: { 'thg-1': { ...initial } },
      reconnectThing: async (thg) => { reconnected.push(thg.id) }
    }
  )
  await svc.updateThing({ id: 'thg-1', opts: { b: 2 }, info: { name: 'New' } })
  t.ok(db._store['thg-1'].opts.a, 'existing opt preserved')
  t.is(db._store['thg-1'].opts.b, 2)
  t.is(db._store['thg-1'].info.name, 'New')
  t.alike(reconnected, ['thg-1'])
})

test('updateThing with forceOverwrite replaces opts entirely', async (t) => {
  const initial = { id: 'thg-1', code: 'T-0001', opts: { a: 1, b: 2 }, info: {}, tags: [], comments: [] }
  const { svc, db } = makeService(
    { 'thg-1': { ...initial } },
    { dbEntries: { 'thg-1': { ...initial } }, reconnectThing: async () => {} }
  )
  await svc.updateThing({ id: 'thg-1', opts: { c: 3 }, forceOverwrite: true })
  t.absent(db._store['thg-1'].opts.a)
  t.is(db._store['thg-1'].opts.c, 3)
})

test('updateThing calls updateThingHook0 with new and previous state', async (t) => {
  const calls = []
  const initial = { id: 'thg-1', code: 'T-0001', opts: {}, info: { name: 'Old' }, tags: [], comments: [] }
  const { svc } = makeService(
    { 'thg-1': { ...initial } },
    {
      dbEntries: { 'thg-1': { ...initial } },
      reconnectThing: async () => {},
      updateThingHook0: async (thg, prev) => { calls.push({ new: thg.info.name, old: prev.info.name }) }
    }
  )
  await svc.updateThing({ id: 'thg-1', info: { name: 'New' } })
  t.is(calls[0].old, 'Old')
  t.is(calls[0].new, 'New')
})

test('updateThing adds comment when comment and user are provided', async (t) => {
  const initial = { id: 'thg-1', code: 'T-0001', opts: {}, info: {}, tags: [], comments: [] }
  const { svc, db } = makeService(
    { 'thg-1': { ...initial } },
    { dbEntries: { 'thg-1': { ...initial } }, reconnectThing: async () => {} }
  )
  await svc.updateThing({ id: 'thg-1', comment: 'updated', user: 'alice' })
  t.is(db._store['thg-1'].comments.length, 1)
})

test('updateThing sets updatedAt on info', async (t) => {
  const initial = { id: 'thg-1', code: 'T-0001', opts: {}, info: {}, tags: [], comments: [] }
  const before = Date.now()
  const { svc, db } = makeService(
    { 'thg-1': { ...initial } },
    { dbEntries: { 'thg-1': { ...initial } }, reconnectThing: async () => {} }
  )
  await svc.updateThing({ id: 'thg-1', info: { name: 'X' } })
  const after = Date.now()
  const updatedAt = db._store['thg-1'].info.updatedAt
  t.ok(updatedAt >= before && updatedAt <= after)
})

// ---------------------------------------------------------------------------
// checkThingExists
// ---------------------------------------------------------------------------

test('checkThingExists throws ERR_THING_NOTFOUND when thing is missing', (t) => {
  const { svc } = makeService()
  t.exception(() => svc.checkThingExists({ thingId: 'missing' }), /ERR_THING_NOTFOUND/)
})

test('checkThingExists passes when thing exists', (t) => {
  const { svc } = makeService({ 'thg-1': { id: 'thg-1' } })
  t.execution(() => svc.checkThingExists({ thingId: 'thg-1' }))
})

// ---------------------------------------------------------------------------
// loadThing
// ---------------------------------------------------------------------------

test('loadThing returns parsed thing from db', async (t) => {
  const initial = { id: 'thg-1', code: 'T-0001' }
  const { svc } = makeService({}, { dbEntries: { 'thg-1': initial } })
  const result = await svc.loadThing({ thingId: 'thg-1' })
  t.alike(result, initial)
})

// ---------------------------------------------------------------------------
// assignCodesToThings
// ---------------------------------------------------------------------------

test('assignCodesToThings sets nextAvailableCode and skips things that already have codes', async (t) => {
  const thg1 = { id: 'thg-1', code: 'THG-0001', tags: [] }
  const { svc, mem } = makeService({ 'thg-1': thg1 })
  await svc.assignCodesToThings()
  t.ok(mem.nextAvailableCode)
})

test('assignCodesToThings assigns codes to things without one', async (t) => {
  const thg = { id: 'thg-1', code: null, tags: [], opts: {}, info: {} }
  const { svc, things } = makeService(
    { 'thg-1': thg },
    { dbEntries: { 'thg-1': thg } }
  )
  await svc.assignCodesToThings()
  t.ok(things['thg-1'].code, 'code was assigned')
  t.ok(/-\d{4}$/.test(things['thg-1'].code), 'code follows XXXX-NNNN format')
})
