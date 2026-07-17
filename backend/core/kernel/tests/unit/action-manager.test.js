'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build, validateFull } = require('../../lib/protocol/envelope')
const { ActionManager } = require('../../lib/modules/action-manager')
const { ACTION_NEG_VOTES_THRESHOLD } = require('../../lib/modules/action-manager/constants')
const KernelManager = require('../../lib/kernel.manager')

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-kernel-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'config'), { recursive: true })
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

function createManager (overrides = {}) {
  const pushed = []
  const actionApprover = {
    pushAction: async (data) => {
      pushed.push(data)
      return { id: 42, ...data }
    },
    getAction: async (type, id) => ({
      data: {
        id,
        type,
        payload: [[{ mode: 'high' }], { 'worker-1': { calls: [{ id: 'dev-1' }] } }, ['miner']]
      }
    }),
    voteAction: async () => {},
    cancelActionsBatch: async (req) => req.ids,
    query: async function * () {
      yield {
        id: 1,
        batchActionUID: '1000-batch-repair',
        payload: [[], { 'worker-1': { calls: [{ id: 'dev-1', tags: ['a'] }] } }, ['miner']]
      }
    },
    initDb: async () => {},
    initWrk: () => {},
    startInterval: () => {},
    ...overrides.actionApprover
  }
  const actionCaller = {
    getWriteCalls: async () => ({
      targets: {
        'worker-1': {
          reqVotes: 2,
          calls: [{ id: 'dev-1', tags: [] }]
        }
      },
      requiredPerms: ['miner']
    }),
    ...overrides.actionCaller
  }

  const manager = new ActionManager({
    actionApprover,
    actionCaller,
    store: {},
    actionIntvlMs: 1000,
    ...overrides.managerOpts
  })

  return { manager, pushed, actionApprover, actionCaller }
}

test('action envelopes - validateFull accepts action.push payload', (t) => {
  const env = build({
    action: ACTIONS.ACTION_PUSH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: {
      query: { tags: { $in: ['miner'] } },
      action: 'reboot',
      params: [],
      voter: 'user@example.com',
      authPerms: ['miner:w']
    }
  })

  const result = validateFull(env)
  t.ok(result.valid, result.error)
})

test('action manager - pushAction returns errors when no write calls', async (t) => {
  const { manager } = createManager({
    actionCaller: {
      getWriteCalls: async () => ({
        targets: { 'worker-1': { reqVotes: 1, calls: [], error: 'ERR_NO_MATCH' } },
        requiredPerms: []
      })
    }
  })

  const result = await manager.pushAction({
    query: { id: 'dev-1' },
    action: 'reboot',
    params: [],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(result.id, null)
  t.ok(result.errors.some(e => e.includes('worker-1')))
  t.ok(result.errors.includes('ERR_KERNEL_ACTION_CALLS_EMPTY'))
})

test('action manager - pushAction submits action when calls exist', async (t) => {
  const { manager, pushed } = createManager()

  const result = await manager.pushAction({
    query: { id: 'dev-1' },
    action: 'reboot',
    params: [{ mode: 'high' }],
    voter: 'user@example.com',
    authPerms: ['miner:w'],
    batchActionUID: 'batch-1'
  })

  t.is(result.id, 42)
  t.is(result.errors.length, 0)
  t.is(pushed[0].action, 'reboot')
  t.is(pushed[0].reqVotesPos, 2)
  t.is(pushed[0].batchActionUID, 'batch-1')
  t.alike(pushed[0].payload[2], ['miner'])
  t.ok(!('reqVotes' in pushed[0].payload[1]['worker-1']))
})

test('action manager - pushActionsBatch rejects invalid payload', async (t) => {
  const { manager } = createManager()
  await t.exception(
    () => manager.pushActionsBatch({ batchActionsPayload: null, voter: 'user@example.com', authPerms: [] }),
    /ERR_PAYLOAD_INVALID/
  )
})

test('action manager - pushActionsBatch applies shared batch metadata', async (t) => {
  const { manager } = createManager()
  const results = await manager.pushActionsBatch({
    batchActionsPayload: [
      { query: { id: 'dev-1' }, action: 'reboot', params: [] },
      { query: { id: 'dev-2' }, action: 'reboot', params: [] }
    ],
    voter: 'user@example.com',
    authPerms: ['miner:w'],
    batchActionUID: 'repair',
    suffix: 'site-a'
  })

  t.is(results.length, 2)
  t.ok(results[0].id)
})

test('action manager - getAction unpacks stored payload', async (t) => {
  const { manager } = createManager()
  const action = await manager.getAction({ id: 1, type: 'voting' })

  t.alike(action.params, [{ mode: 'high' }])
  t.alike(action.requiredPerms, ['miner'])
  t.ok(action.targets['worker-1'])
  t.ok(!action.payload)
})

test('action manager - getActionsBatch returns first matching lifecycle type', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async (type, id) => {
        if (type === 'ready') throw new Error('not found')
        if (type === 'executing') {
          return { data: { id, type, payload: [[], {}, []] } }
        }
        return { data: { id, type, payload: [[], {}, []] } }
      }
    }
  })

  const results = await manager.getActionsBatch({ ids: [5, 6] })
  t.is(results.length, 2)
  t.is(results[0].type, 'voting')
  t.is(results[1].type, 'voting')
})

test('action manager - voteAction checks required permissions', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => ({
        data: { payload: [[], {}, ['miner', 'container']] }
      }),
      voteAction: async () => {}
    }
  })

  await t.exception(async () => {
    await manager.voteAction({
      id: 1,
      voter: 'user@example.com',
      approve: true,
      authPerms: ['miner:r']
    })
  }, /ERR_ACTION_DENIED/)

  const voted = await manager.voteAction({
    id: 1,
    voter: 'user@example.com',
    approve: true,
    authPerms: ['miner:w', 'container:w']
  })
  t.is(voted, 1)
})

test('action manager - queryActions validates query list', async (t) => {
  const { manager } = createManager()

  await t.exception(
    () => manager.queryActions({ queries: 'bad' }),
    /ERR_QUERIES_INVALID/
  )
  await t.exception(
    () => manager.queryActions({ queries: [{}] }),
    /ERR_QUERIES_TYPE_INVALID/
  )
})

test('action manager - queryActions filters and strips call tags', async (t) => {
  const { manager } = createManager()
  const result = await manager.queryActions({
    queries: [{
      type: 'voting',
      query: { id: 1 },
      suffix: 'repair'
    }],
    suffix: 'repair'
  })

  t.ok(Array.isArray(result.voting))
  t.is(result.voting.length, 1)
  t.ok(!result.voting[0].payload)
  t.ok(!result.voting[0].targets['worker-1'].calls[0].tags)
})

test('action manager - cancelActionsBatch delegates to approver', async (t) => {
  const { manager } = createManager()
  const cancelled = await manager.cancelActionsBatch({
    ids: [1, 2],
    voter: 'user@example.com'
  })
  t.alike(cancelled, [1, 2])
})

test('action manager - start wires action approver dependencies', async (t) => {
  const store = { db: 'action-approver' }
  let initDbStore = null
  let initWrkProxy = null
  let intervalMs = null

  const { manager } = createManager({
    managerOpts: { store, actionIntvlMs: 15000 },
    actionApprover: {
      initDb: async (s) => { initDbStore = s },
      initWrk: (proxy) => { initWrkProxy = proxy },
      startInterval: (ms) => { intervalMs = ms }
    }
  })

  await manager.start()
  t.is(initDbStore, store)
  t.ok(initWrkProxy)
  t.is(typeof initWrkProxy.reboot, 'function')
  t.is(intervalMs, 15000)
})

test('kernel-manager - init creates action infrastructure', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await kernel.init()

  t.ok(kernel.actionCaller, 'action caller created')
  t.ok(kernel.actionApprover_0, 'action approver created')
  t.ok(kernel.actionManager, 'action manager created')

  await kernel.stop()
})

test('action manager - pushAction rejects when getWriteCalls returns no targets', async (t) => {
  const { manager, pushed } = createManager({
    actionCaller: {
      getWriteCalls: async () => ({ targets: {}, requiredPerms: [] })
    }
  })

  const result = await manager.pushAction({
    query: { id: 'missing' },
    action: 'reboot',
    params: [],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(result.id, null)
  t.ok(result.errors.includes('ERR_KERNEL_ACTION_CALLS_EMPTY'))
  t.is(pushed.length, 0, 'does not submit when no calls exist')
})

test('action manager - pushAction succeeds with partial worker failures', async (t) => {
  const { manager, pushed } = createManager({
    actionCaller: {
      getWriteCalls: async () => ({
        targets: {
          'worker-1': { reqVotes: 2, calls: [{ id: 'dev-1', tags: [] }] },
          'worker-2': { reqVotes: 1, calls: [], error: 'ERR_NO_MATCH' }
        },
        requiredPerms: ['miner']
      })
    }
  })

  const result = await manager.pushAction({
    query: { tags: { $in: ['rack-a'] } },
    action: 'reboot',
    params: [],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(result.id, 42, 'creates action when at least one worker has calls')
  t.ok(result.errors.some(e => e.includes('worker-2')), 'records per-worker empty-call errors')
  t.ok(!('reqVotes' in pushed[0].payload[1]['worker-1']), 'strips reqVotes from successful worker')
  t.ok(!('reqVotes' in pushed[0].payload[1]['worker-2']), 'strips reqVotes from failed worker')
})

test('action manager - pushAction uses highest reqVotes across workers', async (t) => {
  const { manager, pushed } = createManager({
    actionCaller: {
      getWriteCalls: async () => ({
        targets: {
          'worker-1': { reqVotes: 2, calls: [{ id: 'dev-1' }] },
          'worker-2': { reqVotes: 5, calls: [{ id: 'dev-2' }] }
        },
        requiredPerms: ['miner']
      })
    }
  })

  await manager.pushAction({
    query: { id: { $in: ['dev-1', 'dev-2'] } },
    action: 'reboot',
    params: [],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(pushed[0].reqVotesPos, 5, 'uses max reqVotes across workers')
  t.is(pushed[0].reqVotesNeg, ACTION_NEG_VOTES_THRESHOLD)
})

test('action manager - pushAction propagates getWriteCalls failures', async (t) => {
  const { manager } = createManager({
    actionCaller: {
      getWriteCalls: async () => { throw new Error('ERR_QUERY_INVALID') }
    }
  })

  await t.exception(
    () => manager.pushAction({
      query: null,
      action: 'reboot',
      params: [],
      voter: 'user@example.com',
      authPerms: ['miner:w']
    }),
    /ERR_QUERY_INVALID/
  )
})

test('action manager - pushAction propagates approver failures', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      pushAction: async () => { throw new Error('ERR_ACTION_STORE_FAILED') }
    }
  })

  await t.exception(
    () => manager.pushAction({
      query: { id: 'dev-1' },
      action: 'reboot',
      params: [],
      voter: 'user@example.com',
      authPerms: ['miner:w']
    }),
    /ERR_ACTION_STORE_FAILED/
  )
})

test('action manager - pushActionsBatch returns empty array for empty payload', async (t) => {
  const { manager } = createManager()
  const results = await manager.pushActionsBatch({
    batchActionsPayload: [],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })
  t.alike(results, [])
})

test('action manager - pushActionsBatch rejects non-array payload shapes', async (t) => {
  const { manager } = createManager()

  await t.exception(
    () => manager.pushActionsBatch({ batchActionsPayload: {}, voter: 'u', authPerms: [] }),
    /ERR_PAYLOAD_INVALID/
  )
  await t.exception(
    () => manager.pushActionsBatch({ batchActionsPayload: 'bad', voter: 'u', authPerms: [] }),
    /ERR_PAYLOAD_INVALID/
  )
})

test('action manager - pushActionsBatch returns mixed success and failure entries', async (t) => {
  let callCount = 0
  const { manager } = createManager({
    actionCaller: {
      getWriteCalls: async () => {
        callCount++
        if (callCount === 1) {
          return {
            targets: { 'worker-1': { reqVotes: 1, calls: [{ id: 'dev-1' }] } },
            requiredPerms: ['miner']
          }
        }
        return { targets: {}, requiredPerms: [] }
      }
    }
  })

  const results = await manager.pushActionsBatch({
    batchActionsPayload: [
      { query: { id: 'dev-1' }, action: 'reboot', params: [] },
      { query: { id: 'missing' }, action: 'reboot', params: [] }
    ],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(results.length, 2)
  t.ok(results[0].id, 'first entry succeeds')
  t.is(results[1].id, null, 'second entry fails without blocking batch')
  t.ok(results[1].errors.includes('ERR_KERNEL_ACTION_CALLS_EMPTY'))
})

test('action manager - pushActionsBatch omits batchActionUID when not provided', async (t) => {
  const { manager, pushed } = createManager()

  await manager.pushActionsBatch({
    batchActionsPayload: [{ query: { id: 'dev-1' }, action: 'reboot', params: [] }],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(pushed.length, 1)
  t.is(pushed[0].batchActionUID, undefined, 'does not invent batchActionUID')
})

test('action manager - getActionsBatch returns empty array for empty ids', async (t) => {
  const { manager } = createManager()
  const results = await manager.getActionsBatch({ ids: [] })
  t.alike(results, [])
})

test('action manager - getActionsBatch omits ids with no lifecycle match', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => { throw new Error('ERR_ACTION_ID_NOT_FOUND') }
    }
  })

  const results = await manager.getActionsBatch({ ids: [99, 100] })
  t.alike(results, [], 'unknown ids are filtered out')
})

test('action manager - getActionsBatch returns only resolvable ids', async (t) => {
  let calls = 0
  const { manager } = createManager({
    actionApprover: {
      getAction: async (type, id) => {
        calls++
        if (id === 7) throw new Error('ERR_ACTION_ID_NOT_FOUND')
        return { data: { id, type, payload: [[], {}, ['miner']] } }
      }
    }
  })

  const results = await manager.getActionsBatch({ ids: [7, 8] })
  t.is(results.length, 1)
  t.is(results[0].action.id, 8)
  t.ok(calls >= 4, 'still probes lifecycle types for missing ids')
})

test('action manager - voteAction rejects empty authPerms', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => ({
        data: { payload: [[], {}, ['miner']] }
      })
    }
  })

  await t.exception(
    () => manager.voteAction({
      id: 1,
      voter: 'user@example.com',
      approve: true,
      authPerms: []
    }),
    /ERR_ACTION_DENIED/
  )
})

test('action manager - voteAction rejects null authPerms', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => ({
        data: { payload: [[], {}, ['miner']] }
      })
    }
  })

  try {
    await manager.voteAction({
      id: 1,
      voter: 'user@example.com',
      approve: true,
      authPerms: null
    })
    t.fail('null authPerms should throw')
  } catch (err) {
    t.ok(err instanceof TypeError, 'null authPerms causes TypeError')
  }
})

test('action manager - voteAction allows vote when action has no required perms', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => ({
        data: { payload: [[], {}, []] }
      }),
      voteAction: async () => {}
    }
  })

  const voted = await manager.voteAction({
    id: 1,
    voter: 'user@example.com',
    approve: true,
    authPerms: []
  })
  t.is(voted, 1, 'empty requiredBaseTypePerms does not block vote')
})

test('action manager - voteAction propagates missing action errors', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => { throw new Error('ERR_ACTION_ID_NOT_FOUND') }
    }
  })

  await t.exception(async () => {
    await manager.voteAction({
      id: 999,
      voter: 'user@example.com',
      approve: true,
      authPerms: ['miner']
    })
  }, /ERR_ACTION_ID_NOT_FOUND/)
})

test('action manager - queryActions accepts empty queries array', async (t) => {
  const { manager } = createManager()
  const result = await manager.queryActions({ queries: [] })
  t.alike(result, {})
})

test('action manager - queryActions rejects non-string query type', async (t) => {
  const { manager } = createManager()

  await t.exception(
    () => manager.queryActions({ queries: [{ type: 123 }] }),
    /ERR_QUERIES_TYPE_INVALID/
  )
  await t.exception(
    () => manager.queryActions({ queries: [{ type: '' }] }),
    /ERR_QUERIES_TYPE_INVALID/
  )
})

test('action manager - queryActions suffix filter excludes non-matching batches', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      query: async function * () {
        yield {
          id: 1,
          batchActionUID: '1000-repair-site-a',
          payload: [[], { 'worker-1': { calls: [{ id: 'dev-1', tags: ['x'] }] } }, ['miner']]
        }
        yield {
          id: 2,
          batchActionUID: '1000-repair-site-b',
          payload: [[], { 'worker-1': { calls: [{ id: 'dev-2', tags: ['y'] }] } }, ['miner']]
        }
      }
    }
  })

  const result = await manager.queryActions({
    queries: [{ type: 'voting', suffix: 'site-a' }],
    suffix: 'site-a'
  })

  t.is(result.voting.length, 1)
  t.is(result.voting[0].id, 1)
  t.ok(result.voting[0].batchActionUID.endsWith('site-a'))
})

test('action manager - queryActions mingo query excludes non-matching actions', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      query: async function * () {
        yield {
          id: 1,
          action: 'reboot',
          payload: [[], { 'worker-1': { calls: [{ id: 'dev-1' }] } }, ['miner']]
        }
        yield {
          id: 2,
          action: 'setPowerMode',
          payload: [[], { 'worker-1': { calls: [{ id: 'dev-2' }] } }, ['miner']]
        }
      }
    }
  })

  const result = await manager.queryActions({
    queries: [{
      type: 'voting',
      query: { action: 'reboot' }
    }]
  })

  t.is(result.voting.length, 1)
  t.is(result.voting[0].action, 'reboot')
})

test('action manager - queryActions groupBatch deduplicates shared batchActionUID', async (t) => {
  const batchTs = Date.now()
  const batchUid = `${batchTs}-repair-site-a`
  const otherBatchUid = `${batchTs}-repair-site-b`
  const payload = [[], { 'worker-1': { calls: [{ id: 'dev-1', tags: [] }] } }, ['miner']]
  const streamEntries = [
    { id: batchTs, batchActionUID: batchUid, payload },
    { id: batchTs + 1, batchActionUID: batchUid, payload },
    { id: batchTs + 2, batchActionUID: otherBatchUid, payload },
    { id: batchTs + 3, payload: [[], { 'worker-1': { calls: [{ id: 'dev-3' }] } }, ['miner']] }
  ]

  const cloneEntry = (entry) => ({
    ...entry,
    payload: [
      [...entry.payload[0]],
      JSON.parse(JSON.stringify(entry.payload[1])),
      [...entry.payload[2]]
    ]
  })

  const { manager } = createManager({
    actionApprover: {
      query: async function * (type, filter) {
        const source = filter && typeof filter === 'object' && 'gte' in filter
          ? streamEntries.filter(e => e.id >= filter.gte && e.id <= filter.lte)
          : streamEntries
        for (const entry of source) {
          yield cloneEntry(entry)
        }
      }
    }
  })

  const result = await manager.queryActions({
    queries: [{ type: 'ready' }],
    groupBatch: true
  })

  t.is(result.ready.length, 3, 'two grouped batches plus one standalone action')
  const grouped = result.ready.find(item => item.batchActionUID === batchUid)
  t.ok(grouped, 'grouped batch entry exists')
  t.ok(Array.isArray(grouped.actions), 'grouped batch includes nested actions')
  t.is(grouped.actions.length, 2, 'nested actions exclude unrelated batch members in time window')
  const otherGrouped = result.ready.find(item => item.batchActionUID === otherBatchUid)
  t.ok(otherGrouped, 'other batch in same time window is grouped separately')
  t.is(otherGrouped.actions.length, 1, 'other batch contains only its own member')
})

test('action manager - getAction propagates approver lookup failures', async (t) => {
  const { manager } = createManager({
    actionApprover: {
      getAction: async () => { throw new Error('ERR_ACTION_ID_NOT_FOUND') }
    }
  })

  await t.exception(
    () => manager.getAction({ id: 404, type: 'voting' }),
    /ERR_ACTION_ID_NOT_FOUND/
  )
})
