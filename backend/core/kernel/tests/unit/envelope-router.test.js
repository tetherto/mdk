'use strict'

const test = require('brittle')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { routeEnvelope } = require('../../lib/transport/envelope-router')
const { fakeAuthorizer } = require('../helpers/fake-authorizer')

function createDeps (actionManagerOverrides = {}) {
  const calls = { push: [], vote: [], query: [], cancel: [] }
  const actionManager = {
    pushAction: async (payload) => {
      calls.push.push(payload)
      return { id: 123, data: { id: 123 }, errors: [] }
    },
    pushActionsBatch: async (payload) => {
      calls.push.push(payload)
      return [{ id: 124 }]
    },
    getAction: async (payload) => ({ id: payload.id, type: payload.type }),
    getActionsBatch: async (payload) => [{ id: payload.ids[0], type: 'voting' }],
    queryActions: async (payload) => {
      calls.query.push(payload)
      return { voting: [] }
    },
    voteAction: async (payload) => {
      calls.vote.push(payload)
      return 1
    },
    cancelActionsBatch: async (payload) => {
      calls.cancel.push(payload)
      return ['cancelled']
    },
    ...actionManagerOverrides
  }

  calls.logged = []
  return {
    calls,
    deps: {
      dispatcher: {
        dispatch: async () => ({ status: 'QUEUED' }),
        recordAttempt: async (envelope, requester, result) => { calls.logged.push({ envelope, requester, result }) },
        getLog: async (query) => ({ entries: [{ query }] })
      },
      telemetryCollector: { pull: async () => ({}), pullState: async () => ({}) },
      registry: {
        listWorkers: () => [{ workerId: 'w-1' }],
        getCapabilities: () => ({ commands: [] }),
        terminate: async () => {}
      },
      actionManager
    }
  }
}

test('envelope router - routes action.push to action manager', async (t) => {
  const { calls, deps } = createDeps()
  const envelope = build({
    action: ACTIONS.ACTION_PUSH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: {
      query: { id: 'dev-1' },
      action: 'reboot',
      params: [],
      voter: 'user@example.com',
      authPerms: ['miner:w']
    }
  })

  const result = await routeEnvelope(envelope, deps)
  t.is(calls.push.length, 1)
  t.is(calls.push[0].action, 'reboot')
  t.is(result.id, 123)
})

test('envelope router - routes all action lifecycle envelopes', async (t) => {
  const { calls, deps } = createDeps()

  await routeEnvelope(build({
    action: ACTIONS.ACTION_PUSH_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { batchActionsPayload: [], voter: 'user@example.com', authPerms: [] }
  }), deps)
  t.is(calls.push.length, 1)

  const getRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_GET,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { id: 7, type: 'voting' }
  }), deps)
  t.is(getRes.id, 7)

  const batchRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_GET_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { ids: [8] }
  }), deps)
  t.is(batchRes[0].id, 8)

  await routeEnvelope(build({
    action: ACTIONS.ACTION_QUERY,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { queries: [{ type: 'voting' }] }
  }), deps)
  t.is(calls.query.length, 1)

  const voteRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { id: 9, voter: 'user@example.com', approve: true, authPerms: ['miner:w'] }
  }), deps)
  t.is(voteRes, 1)
  t.is(calls.vote[0].id, 9)

  const cancelRes = await routeEnvelope(build({
    action: ACTIONS.ACTION_CANCEL_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { ids: [10], voter: 'user@example.com' }
  }), deps)
  t.alike(cancelRes, ['cancelled'])
})

test('envelope router - still routes worker and command envelopes', async (t) => {
  const { deps } = createDeps()
  let terminated = null
  deps.registry.terminate = async (workerId) => { terminated = workerId }

  const workers = await routeEnvelope(build({
    action: ACTIONS.WORKER_LIST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway'
  }), deps)
  t.is(workers.workers.length, 1)

  const terminateRes = await routeEnvelope(build({
    action: ACTIONS.WORKER_TERMINATE,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { workerId: 'w-1' }
  }), deps)
  t.is(terminated, 'w-1')
  t.is(terminateRes.status, 'TERMINATED')
})

const CALLER_KEY = 'ab'.repeat(32)

test('envelope router - rejects a payload that fails its schema (validateFull)', async (t) => {
  const { calls, deps } = createDeps()
  const res = await routeEnvelope(build({
    action: ACTIONS.ACTION_PUSH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { action: 'reboot', voter: 'u', authPerms: [], params: [] }
  }), deps)
  t.is(res.error, 'ERR_PAYLOAD_QUERY_REQUIRED')
  t.is(calls.push.length, 0, 'action manager never reached')
})

test('envelope router - rejects oversized arrays', async (t) => {
  const { deps } = createDeps()
  const res = await routeEnvelope(build({
    action: ACTIONS.ACTION_GET_BATCH,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'gateway',
    payload: { ids: new Array(5000).fill(1) }
  }), deps)
  t.ok(/ERR_PAYLOAD_IDS_TOO_MANY/.test(res.error))
})

test('envelope router - a caller is authorized per request; a denial never reaches the module', async (t) => {
  const { calls, deps } = createDeps()
  deps.authorizer = fakeAuthorizer({ allow: (a) => a === ACTIONS.WORKER_LIST })
  const caller = { publicKey: CALLER_KEY }

  const list = await routeEnvelope(build({ action: ACTIONS.WORKER_LIST, type: MESSAGE_TYPES.REQUEST, sender: 'x' }), deps, caller)
  t.is(list.workers.length, 1, 'allowed')

  const cmd = await routeEnvelope(build({
    action: ACTIONS.COMMAND_REQUEST, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId: 'd', payload: { command: 'reboot' }
  }), deps, caller)
  t.ok(/ERR_KERNEL_ACTION_FORBIDDEN/.test(cmd.error))
  t.is(calls.logged.length, 1, 'the refused command is logged')
  t.alike(calls.logged[0].requester, { requesterId: 'app:test', roles: ['test'] })
  t.is(calls.logged[0].result.error, cmd.error)

  const vote = await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { id: 1, voter: 'v', approve: true, authPerms: [] }
  }), deps, caller)
  t.ok(/ERR_KERNEL_ACTION_FORBIDDEN/.test(vote.error))
  t.is(calls.vote.length, 0)
  t.alike(deps.authorizer.calls.map((c) => c.caller), [CALLER_KEY, CALLER_KEY, CALLER_KEY], 'each request checked')
})

test('envelope router - a caller with no authorizer is refused', async (t) => {
  const { deps } = createDeps()
  const res = await routeEnvelope(build({ action: ACTIONS.WORKER_LIST, type: MESSAGE_TYPES.REQUEST, sender: 'x' }), deps, { publicKey: CALLER_KEY })
  t.is(res.error, 'ERR_KERNEL_NO_AUTHORIZER')
})

test('envelope router - a caller votes and requests as its token identity', async (t) => {
  const { calls, deps } = createDeps()
  let dispatchOpts = null
  deps.dispatcher.dispatch = async (_env, opts) => { dispatchOpts = opts; return { status: 'QUEUED' } }
  deps.authorizer = fakeAuthorizer({ sub: 'app:ops-center', roles: ['operator'] })
  const caller = { publicKey: CALLER_KEY }

  await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { id: 1, voter: 'someone-else', approve: true, authPerms: [] }
  }), deps, caller)
  t.is(calls.vote[0].voter, 'app:ops-center', 'self-asserted voter replaced')

  await routeEnvelope(build({
    action: ACTIONS.COMMAND_REQUEST, type: MESSAGE_TYPES.REQUEST, sender: 'spoofed', deviceId: 'd', payload: { command: 'reboot' }
  }), deps, caller)
  t.is(dispatchOpts.requesterId, 'app:ops-center', 'requester is the token subject, not envelope.sender')
  t.alike(dispatchOpts.roles, ['operator'], 'and its spec.rbac roles go to the write-command log')
})

test('envelope router - an app acting for an operator requests and votes as the operator, via the app', async (t) => {
  const { calls, deps } = createDeps()
  let dispatchOpts = null
  deps.dispatcher.dispatch = async (_env, opts) => { dispatchOpts = opts; return { status: 'QUEUED' } }
  const writes = []
  deps.authorizer = fakeAuthorizer({ sub: 'app:ops-center', roles: ['app-ops-center'], delegate: true, canWrite: (deviceId, actor) => { writes.push([deviceId, actor && actor.sub]); return true } })
  const caller = { publicKey: CALLER_KEY }
  const req = (action, payload, deviceId) => build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId, payload, auth: 'app-token', actor: 'alice' })

  await routeEnvelope(req(ACTIONS.COMMAND_REQUEST, { command: 'reboot' }, 'd'), deps, caller)
  t.alike(dispatchOpts, { requesterId: 'alice', roles: ['operator'], via: { requesterId: 'app:ops-center', roles: ['app-ops-center'] } })

  await routeEnvelope(req(ACTIONS.ACTION_VOTE, { id: 1, voter: 'someone-else', approve: true, authPerms: [] }), deps, caller)
  t.is(calls.vote[0].voter, 'alice', 'the operator votes, even for an app that may delegate')

  deps.actionManager.pushAction = async (payload, opts) => { calls.push.push(payload); opts.canWrite('d-1'); return { id: 1 } }
  await routeEnvelope(req(ACTIONS.ACTION_PUSH, { query: { id: 'd-1' }, action: 'reboot', params: [], voter: 'v', authPerms: [] }), deps, caller)
  t.is(calls.push[0].voter, 'alice')
  t.alike(writes, [['d-1', 'alice']], 'device writes are checked for the operator too')
})

test('envelope router - a refused command is logged as the operator, via the app', async (t) => {
  const { calls, deps } = createDeps()
  deps.authorizer = fakeAuthorizer({ allow: () => false })
  await routeEnvelope(build({
    action: ACTIONS.COMMAND_REQUEST, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId: 'd', payload: { command: 'reboot' }, auth: 't', actor: 'bob'
  }), deps, { publicKey: CALLER_KEY })
  t.alike(calls.logged[0].requester, { requesterId: 'bob', roles: ['operator'], via: { requesterId: 'app:test', roles: ['test'] } })
})

test('envelope router - command.log needs commands: read', async (t) => {
  const { deps } = createDeps()
  const req = build({ action: ACTIONS.COMMAND_LOG, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { limit: 5 } })
  deps.authorizer = fakeAuthorizer({ allow: (a) => a !== ACTIONS.COMMAND_LOG })
  t.ok(/ERR_KERNEL_ACTION_FORBIDDEN/.test((await routeEnvelope(req, deps, { publicKey: CALLER_KEY })).error))
  deps.authorizer = fakeAuthorizer()
  t.alike(await routeEnvelope(req, deps, { publicKey: CALLER_KEY }), { entries: [{ query: { limit: 5 } }] })
  const bad = build({ action: ACTIONS.COMMAND_LOG, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { limit: 0 } })
  t.ok(/ERR_PAYLOAD_LIMIT_INVALID/.test((await routeEnvelope(bad, deps)).error))
})

test('envelope router - a caller granted actions: delegate keeps the payload voter', async (t) => {
  const { calls, deps } = createDeps()
  deps.authorizer = fakeAuthorizer({ delegate: true })
  await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'gateway', payload: { id: 1, voter: 'user@example.com', approve: true, authPerms: [] }
  }), deps, { publicKey: CALLER_KEY })
  t.is(calls.vote[0].voter, 'user@example.com')
})

test('envelope router - action pushes carry the caller device rule', async (t) => {
  const { deps } = createDeps()
  let seen = null
  deps.actionManager.pushAction = async (payload, opts) => { seen = opts; return { id: 1 } }
  deps.authorizer = fakeAuthorizer({ canWrite: (d) => d === 'ok' })
  await routeEnvelope(build({
    action: ACTIONS.ACTION_PUSH, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { query: { id: 'dev-1' }, action: 'reboot', params: [], voter: 'v', authPerms: [] }
  }), deps, { publicKey: CALLER_KEY })
  t.ok(seen, 'pushAction got the options')
  t.ok(seen.canWrite('ok'))
  t.absent(seen.canWrite('other'))
})

test('envelope router - votes carry the caller device rule', async (t) => {
  const { deps } = createDeps()
  let seen = null
  deps.actionManager.voteAction = async (payload, opts) => { seen = opts; return 1 }
  deps.authorizer = fakeAuthorizer({ canWrite: (d) => d === 'ok' })
  await routeEnvelope(build({
    action: ACTIONS.ACTION_VOTE, type: MESSAGE_TYPES.REQUEST, sender: 'x', payload: { id: 1, voter: 'v', approve: true, authPerms: ['miner:w'] }
  }), deps, { publicKey: CALLER_KEY })
  t.ok(seen && seen.canWrite('ok'), 'voteAction got the voter device rule')
  t.absent(seen.canWrite('other'))
})
