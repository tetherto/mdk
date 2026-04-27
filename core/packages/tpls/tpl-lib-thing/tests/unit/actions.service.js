'use strict'

const test = require('brittle')
const ActionsService = require('../../lib/services/actions.service')

function makeService ({ things = {}, filterResult = [], invokeHandler = async () => {}, thingConf = { thingQueryConcurrency: 5 } } = {}) {
  return new ActionsService({
    getThings: () => things,
    filterThings: () => filterResult,
    invokeHandler,
    thingConf,
    debugThingError: () => {}
  })
}

// ---------------------------------------------------------------------------
// queryThing
// ---------------------------------------------------------------------------

test('queryThing throws ERR_THING_NOTFOUND when thing does not exist', async (t) => {
  const svc = makeService()
  await t.exception(svc.queryThing({ id: 'missing', method: 'ping', params: [] }), /ERR_THING_NOTFOUND/)
})

test('queryThing throws ERR_THING_NOT_INITIALIZED when ctrl is null', async (t) => {
  const svc = makeService({ things: { abc: { id: 'abc', ctrl: null } } })
  await t.exception(svc.queryThing({ id: 'abc', method: 'ping', params: [] }), /ERR_THING_NOT_INITIALIZED/)
})

test('queryThing throws ERR_THING_METHOD_NOTFOUND when method missing from ctrl', async (t) => {
  const svc = makeService({ things: { abc: { id: 'abc', ctrl: {} } } })
  await t.exception(svc.queryThing({ id: 'abc', method: 'ping', params: [] }), /ERR_THING_METHOD_NOTFOUND/)
})

test('queryThing calls ctrl method and returns result', async (t) => {
  const ctrl = { ping: (...args) => 'pong-' + args[0] }
  const svc = makeService({ things: { abc: { id: 'abc', ctrl } } })
  const result = await svc.queryThing({ id: 'abc', method: 'ping', params: ['x'] })
  t.is(result, 'pong-x')
})

test('queryThing forwards multiple params to ctrl method', async (t) => {
  const ctrl = { add: (a, b) => a + b }
  const svc = makeService({ things: { abc: { id: 'abc', ctrl } } })
  const result = await svc.queryThing({ id: 'abc', method: 'add', params: [3, 4] })
  t.is(result, 7)
})

// ---------------------------------------------------------------------------
// applyThings
// ---------------------------------------------------------------------------

test('applyThings throws ERR_METHOD_INVALID when method is missing', async (t) => {
  const svc = makeService()
  await t.exception(svc.applyThings({ params: [] }), /ERR_METHOD_INVALID/)
})

test('applyThings returns 0 when no things match the filter', async (t) => {
  const things = { a: { id: 'a' }, b: { id: 'b' } }
  const svc = makeService({ things, filterResult: [] })
  const result = await svc.applyThings({ method: 'ping', params: [] })
  t.is(result, 0)
})

test('applyThings calls invokeHandler for each matched thing and returns count', async (t) => {
  const called = []
  const things = { a: { id: 'a' }, b: { id: 'b' } }
  const svc = makeService({
    things,
    filterResult: ['a', 'b'],
    invokeHandler: async (req, thg) => { called.push(thg.id) }
  })
  const result = await svc.applyThings({ method: 'ping', params: [] })
  t.is(result, 2)
  t.alike(called.sort(), ['a', 'b'])
})

test('applyThings skips things not in filter result', async (t) => {
  const called = []
  const things = { a: { id: 'a' }, b: { id: 'b' } }
  const svc = makeService({
    things,
    filterResult: ['a'],
    invokeHandler: async (req, thg) => { called.push(thg.id) }
  })
  const result = await svc.applyThings({ method: 'ping', params: [] })
  t.is(result, 1)
  t.alike(called, ['a'])
})

test('applyThings counts failed invocations as 0 but does not throw', async (t) => {
  const things = { a: { id: 'a' } }
  const svc = makeService({
    things,
    filterResult: ['a'],
    invokeHandler: async () => { throw new Error('ERR_INVOKE') }
  })
  const result = await svc.applyThings({ method: 'ping', params: [] })
  t.is(result, 0)
})
