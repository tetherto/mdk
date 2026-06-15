'use strict'

const test = require('brittle')
const MDKThingWriteCallsFacility = require('../../src/mdk.thing.write.calls.facility')

test('constructor initializes facility correctly', (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  t.ok(facility, 'facility instance created')
  t.is(facility.name, 'mdk-thing-write-calls', 'name is set correctly')
  t.is(facility._hasConf, false, '_hasConf is false')
  t.ok(facility.allowedActions instanceof Map, 'allowedActions is a Map')
  t.is(facility.allowedActions.size, 0, 'allowedActions is empty initially')
  t.end()
})

test('init initializes allowedActions Map', (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  facility.init()

  t.ok(facility.allowedActions instanceof Map, 'allowedActions is a Map')
  t.is(facility.allowedActions.size, 0, 'allowedActions is empty after init')
  t.end()
})

test('bindWriteCalls binds RPC handler with default netFac', (t) => {
  const caller = {
    net_r0: {
      rpcServer: {
        respond: (method, handler) => {
          t.is(method, 'getWriteCalls', 'RPC method is getWriteCalls')
          t.ok(typeof handler === 'function', 'handler is a function')
        },
        parseInputJSON: (data) => JSON.parse(data),
        toOutJSON: (data) => JSON.stringify(data)
      }
    }
  }
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  facility.bindWriteCalls()

  t.pass('bindWriteCalls completed without error')
  t.end()
})

test('bindWriteCalls binds RPC handler with custom netFac', (t) => {
  const caller = {
    custom_net: {
      rpcServer: {
        respond: (method, handler) => {
          t.is(method, 'getWriteCalls', 'RPC method is getWriteCalls')
          t.ok(typeof handler === 'function', 'handler is a function')
        },
        parseInputJSON: (data) => JSON.parse(data),
        toOutJSON: (data) => JSON.stringify(data)
      }
    }
  }
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  facility.bindWriteCalls('custom_net')

  t.pass('bindWriteCalls completed without error')
  t.end()
})

test('bindWriteCalls registers handler function', (t) => {
  let registeredHandler = null
  const caller = {
    net_r0: {
      rpcServer: {
        respond: (method, handler) => {
          t.is(method, 'getWriteCalls', 'RPC method is getWriteCalls')
          registeredHandler = handler
          t.ok(typeof handler === 'function', 'handler is a function')
        },
        parseInputJSON: (data) => JSON.parse(data),
        toOutJSON: (data) => JSON.stringify(data)
      }
    }
  }
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  facility.bindWriteCalls()

  t.ok(registeredHandler, 'handler function is registered')
  t.end()
})

test('getWriteCalls returns empty result for non-allowed action', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  const data = {
    query: {},
    action: 'nonAllowedAction',
    params: []
  }

  const result = await facility.getWriteCalls(data)

  t.ok(result, 'result is returned')
  t.ok(Array.isArray(result.calls), 'calls is an array')
  t.is(result.calls.length, 0, 'calls array is empty')
  t.is(result.reqVotes, 1, 'reqVotes defaults to 1')
  t.end()
})

test('getWriteCalls returns result with rackActionId', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  await facility.whitelistActions([['testAction', 3]])

  const data = {
    query: {},
    action: 'testAction',
    params: [],
    rackActionId: 'rack-123'
  }

  const result = await facility.getWriteCalls(data)

  t.ok(result, 'result is returned')
  t.is(result.calls.length, 1, 'calls array has one item')
  t.is(result.calls[0].id, 'rack-123', 'call id matches rackActionId')
  t.ok(Array.isArray(result.calls[0].tags), 'tags is an array')
  t.is(result.calls[0].tags.length, 0, 'tags array is empty')
  t.is(result.reqVotes, 3, 'reqVotes matches whitelisted value')
  t.end()
})

test('getWriteCalls returns calls for allowed action with things', async (t) => {
  const things = [
    { id: 'thing1', tags: ['tag1', 'tag2'] },
    { id: 'thing2', tags: ['tag3'] }
  ]

  let queryThingCallCount = 0
  const caller = {
    listThings: (query) => {
      t.ok(query, 'listThings called with query')
      return things
    },
    queryThing: async ({ id, method, params }) => {
      queryThingCallCount++
      t.ok(things.some(t => t.id === id), 'queryThing called with valid thing id')
      t.is(method, 'validateWriteAction', 'method is validateWriteAction')
      t.ok(Array.isArray(params), 'params is an array')
    }
  }
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  await facility.whitelistActions([['testAction', 5]])

  const data = {
    query: { some: 'query' },
    action: 'testAction',
    params: ['param1', 'param2']
  }

  const result = await facility.getWriteCalls(data)

  t.ok(result, 'result is returned')
  t.is(result.calls.length, 2, 'calls array has correct length')
  t.is(result.reqVotes, 5, 'reqVotes matches whitelisted value')
  t.is(queryThingCallCount, 2, 'queryThing called for each thing')
  t.is(result.calls[0].id, 'thing1', 'first call id matches')
  t.alike(result.calls[0].tags, ['tag1', 'tag2'], 'first call tags match')
  t.is(result.calls[1].id, 'thing2', 'second call id matches')
  t.alike(result.calls[1].tags, ['tag3'], 'second call tags match')
  t.end()
})

test('getWriteCalls respects maxParallelWriteValidations option', async (t) => {
  const things = Array.from({ length: 10 }, (_, i) => ({
    id: `thing${i}`,
    tags: [`tag${i}`]
  }))

  let concurrentQueries = 0
  let maxConcurrent = 0
  const caller = {
    listThings: (query) => things,
    queryThing: async ({ id, method, params }) => {
      concurrentQueries++
      maxConcurrent = Math.max(maxConcurrent, concurrentQueries)
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 10))
      concurrentQueries--
    }
  }
  const opts = { maxParallelWriteValidations: 3 }
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  await facility.whitelistActions([['testAction', 2]])

  const data = {
    query: {},
    action: 'testAction',
    params: []
  }

  const result = await facility.getWriteCalls(data)

  t.ok(result, 'result is returned')
  t.is(result.calls.length, 10, 'all things processed')
  t.ok(maxConcurrent <= 3, 'maxParallelWriteValidations limit respected')
  t.end()
})

test('getWriteCalls uses default maxParallelWriteValidations when not provided', async (t) => {
  const things = Array.from({ length: 10 }, (_, i) => ({
    id: `thing${i}`,
    tags: []
  }))

  let concurrentQueries = 0
  let maxConcurrent = 0
  const caller = {
    listThings: (query) => things,
    queryThing: async ({ id, method, params }) => {
      concurrentQueries++
      maxConcurrent = Math.max(maxConcurrent, concurrentQueries)
      await new Promise(resolve => setTimeout(resolve, 10))
      concurrentQueries--
    }
  }
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  await facility.whitelistActions([['testAction', 1]])

  const data = {
    query: {},
    action: 'testAction',
    params: []
  }

  const result = await facility.getWriteCalls(data)

  t.ok(result, 'result is returned')
  t.is(result.calls.length, 10, 'all things processed')
  t.ok(maxConcurrent <= 5, 'default limit of 5 is used')
  t.end()
})

test('whitelistActions adds actions to allowedActions', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  const actions = [
    ['action1', 2],
    ['action2', 3],
    ['action3', 5]
  ]

  await facility.whitelistActions(actions)

  t.is(facility.allowedActions.size, 3, 'all actions added')
  t.is(facility.allowedActions.get('action1'), 2, 'action1 has correct reqVotes')
  t.is(facility.allowedActions.get('action2'), 3, 'action2 has correct reqVotes')
  t.is(facility.allowedActions.get('action3'), 5, 'action3 has correct reqVotes')
  t.end()
})

test('whitelistActions overwrites existing actions', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  await facility.whitelistActions([['action1', 2]])
  t.is(facility.allowedActions.get('action1'), 2, 'initial value set')

  await facility.whitelistActions([['action1', 5]])
  t.is(facility.allowedActions.get('action1'), 5, 'value overwritten')
  t.end()
})

test('whitelistActions handles empty array', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  await facility.whitelistActions([])

  t.is(facility.allowedActions.size, 0, 'no actions added')
  t.end()
})

test('delistActions removes actions from allowedActions', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  await facility.whitelistActions([
    ['action1', 2],
    ['action2', 3],
    ['action3', 5]
  ])

  t.is(facility.allowedActions.size, 3, 'all actions added initially')

  await facility.delistActions(['action1', 'action3'])

  t.is(facility.allowedActions.size, 1, 'two actions removed')
  t.is(facility.allowedActions.has('action1'), false, 'action1 removed')
  t.is(facility.allowedActions.has('action2'), true, 'action2 still present')
  t.is(facility.allowedActions.has('action3'), false, 'action3 removed')
  t.end()
})

test('delistActions handles non-existent actions gracefully', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  await facility.whitelistActions([['action1', 2]])

  await facility.delistActions(['nonExistentAction', 'action1'])

  t.is(facility.allowedActions.size, 0, 'action1 removed, non-existent ignored')
  t.end()
})

test('delistActions handles empty array', async (t) => {
  const caller = {}
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)

  await facility.whitelistActions([['action1', 2]])

  await facility.delistActions([])

  t.is(facility.allowedActions.size, 1, 'no actions removed')
  t.end()
})

test('getWriteCalls passes correct params to queryThing', async (t) => {
  const things = [{ id: 'thing1', tags: [] }]

  let queryThingParams = null
  const caller = {
    listThings: (query) => things,
    queryThing: async ({ id, method, params }) => {
      queryThingParams = { id, method, params }
    }
  }
  const opts = {}
  const ctx = {}

  const facility = new MDKThingWriteCallsFacility(caller, opts, ctx)
  await facility.whitelistActions([['testAction', 1]])

  const data = {
    query: {},
    action: 'testAction',
    params: ['param1', 'param2', 'param3']
  }

  await facility.getWriteCalls(data)

  t.ok(queryThingParams, 'queryThing was called')
  t.is(queryThingParams.id, 'thing1', 'correct thing id passed')
  t.is(queryThingParams.method, 'validateWriteAction', 'correct method passed')
  t.alike(queryThingParams.params, ['testAction', 'param1', 'param2', 'param3'], 'params include action and data params')
  t.end()
})
