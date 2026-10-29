'use strict'

// The typed request wrappers (device reads, worker terminate, action-service
// ops) are thin envelope builders — each must send the right ACTION with its
// payload fields and deviceId. Hermetic, via the { transport } injection seam.

const test = require('brittle')
const { createRawMdkClient } = require('../../index')
const { ACTIONS, MESSAGE_TYPES } = require('../../../kernel/lib/protocol/actions')

function captureTransport () {
  const t = { requests: [] }
  t.connect = async () => {}
  t.close = async () => {}
  t.request = async (envelope) => {
    t.requests.push(envelope)
    return { ok: true }
  }
  return t
}

async function sent (t, call) {
  const transport = captureTransport()
  const client = createRawMdkClient({ transport })
  await client.connect()
  await call(client)
  t.is(transport.requests.length, 1, 'issued exactly one request')
  return transport.requests[0]
}

test('getCapabilities - DEVICE_CAPABILITIES targeted at the device', async (t) => {
  const env = await sent(t, (c) => c.getCapabilities('d1'))
  t.is(env.action, ACTIONS.DEVICE_CAPABILITIES)
  t.is(env.type, MESSAGE_TYPES.REQUEST)
  t.is(env.deviceId, 'd1')
  t.alike(env.payload, {})
})

test('pullState - STATE_PULL targeted at the device', async (t) => {
  const env = await sent(t, (c) => c.pullState('d2'))
  t.is(env.action, ACTIONS.STATE_PULL)
  t.is(env.deviceId, 'd2')
  t.alike(env.payload, {})
})

test('getCommandStatus - COMMAND_STATUS carries the commandId, not a device', async (t) => {
  const env = await sent(t, (c) => c.getCommandStatus('cmd-1'))
  t.is(env.action, ACTIONS.COMMAND_STATUS)
  t.is(env.deviceId, null)
  t.alike(env.payload, { commandId: 'cmd-1' })
})

test('terminateWorker - WORKER_TERMINATE carries workerId in payload', async (t) => {
  const env = await sent(t, (c) => c.terminateWorker('w1'))
  t.is(env.action, ACTIONS.WORKER_TERMINATE)
  t.is(env.deviceId, null, 'not a device-targeted request')
  t.alike(env.payload, { workerId: 'w1' })
})

test('pushActionsBatch - ACTION_PUSH_BATCH forwards batch payload fields', async (t) => {
  const args = {
    batchActionsPayload: [{ action: 'reboot' }],
    voter: 'v1',
    authPerms: ['admin'],
    batchActionUID: 'batch-1',
    suffix: 'sfx'
  }
  const env = await sent(t, (c) => c.pushActionsBatch(args))
  t.is(env.action, ACTIONS.ACTION_PUSH_BATCH)
  t.alike(env.payload, args)
})

test('getAction - ACTION_GET forwards id and type', async (t) => {
  const env = await sent(t, (c) => c.getAction({ id: 'a1', type: 'reboot' }))
  t.is(env.action, ACTIONS.ACTION_GET)
  t.alike(env.payload, { id: 'a1', type: 'reboot' })
})

test('getActionsBatch - ACTION_GET_BATCH forwards ids', async (t) => {
  const env = await sent(t, (c) => c.getActionsBatch({ ids: ['a1', 'a2'] }))
  t.is(env.action, ACTIONS.ACTION_GET_BATCH)
  t.alike(env.payload, { ids: ['a1', 'a2'] })
})

test('queryActions - ACTION_QUERY forwards queries, suffix and groupBatch', async (t) => {
  const args = { queries: [{ type: 'reboot' }], suffix: 'sfx', groupBatch: true }
  const env = await sent(t, (c) => c.queryActions(args))
  t.is(env.action, ACTIONS.ACTION_QUERY)
  t.alike(env.payload, args)
})

test('voteAction - ACTION_VOTE forwards vote fields', async (t) => {
  const args = { id: 'a1', voter: 'v1', approve: true, authPerms: ['admin'] }
  const env = await sent(t, (c) => c.voteAction(args))
  t.is(env.action, ACTIONS.ACTION_VOTE)
  t.alike(env.payload, args)
})

test('cancelActionsBatch - ACTION_CANCEL_BATCH forwards ids and voter', async (t) => {
  const env = await sent(t, (c) => c.cancelActionsBatch({ ids: ['a1'], voter: 'v1' }))
  t.is(env.action, ACTIONS.ACTION_CANCEL_BATCH)
  t.alike(env.payload, { ids: ['a1'], voter: 'v1' })
})

test('pullTelemetry - object query is forwarded with metrics default type', async (t) => {
  const env = await sent(t, (c) => c.pullTelemetry('d1', { key: 'hashrate', limit: 5 }))
  t.is(env.action, ACTIONS.TELEMETRY_PULL)
  t.is(env.deviceId, 'd1')
  t.alike(env.payload, { query: { type: 'metrics', key: 'hashrate', limit: 5 } })
})

test('pullTelemetry - string query becomes { type }', async (t) => {
  const env = await sent(t, (c) => c.pullTelemetry('d1', 'logs'))
  t.alike(env.payload, { query: { type: 'logs' } })
})

test('pullTelemetry - no query defaults to metrics', async (t) => {
  const env = await sent(t, (c) => c.pullTelemetry('d1'))
  t.alike(env.payload, { query: { type: 'metrics' } })
})

test('getCommandLog - COMMAND_LOG forwards the window and limit', async (t) => {
  const env = await sent(t, (c) => c.getCommandLog({ start: 1, end: 2, limit: 10 }))
  t.is(env.action, ACTIONS.COMMAND_LOG)
  t.is(env.deviceId, null)
  t.alike(env.payload, { start: 1, end: 2, limit: 10 })
})

test('getCommandLog - no args sends an unbounded query', async (t) => {
  const env = await sent(t, (c) => c.getCommandLog())
  t.is(env.action, ACTIONS.COMMAND_LOG)
  t.alike(env.payload, { start: undefined, end: undefined, limit: undefined })
})

test('getRbac - RBAC_GET with an empty payload', async (t) => {
  const env = await sent(t, (c) => c.getRbac())
  t.is(env.action, ACTIONS.RBAC_GET)
  t.is(env.deviceId, null)
  t.alike(env.payload, {})
})

test('applyRbac - RBAC_APPLY carries the rbac spec', async (t) => {
  const rbac = { roles: { admin: ['*'] } }
  const env = await sent(t, (c) => c.applyRbac(rbac))
  t.is(env.action, ACTIONS.RBAC_APPLY)
  t.alike(env.payload, { rbac })
})

test('login - AUTH_LOGIN carries username and password', async (t) => {
  const env = await sent(t, (c) => c.login('alice', 's3cret'))
  t.is(env.action, ACTIONS.AUTH_LOGIN)
  t.alike(env.payload, { username: 'alice', password: 's3cret' })
})

test('refreshToken - AUTH_REFRESH carries the refresh token', async (t) => {
  const env = await sent(t, (c) => c.refreshToken('rt-1'))
  t.is(env.action, ACTIONS.AUTH_REFRESH)
  t.alike(env.payload, { refreshToken: 'rt-1' })
})

test('serviceAccountToken - AUTH_TOKEN binds by default', async (t) => {
  const env = await sent(t, (c) => c.serviceAccountToken('assert-1'))
  t.is(env.action, ACTIONS.AUTH_TOKEN)
  t.alike(env.payload, { assertion: 'assert-1' })
})

test('serviceAccountToken - bind: false is forwarded', async (t) => {
  const env = await sent(t, (c) => c.serviceAccountToken('assert-1', { bind: false }))
  t.alike(env.payload, { assertion: 'assert-1', bind: false })
})

test('logout - AUTH_LOGOUT carries the refresh token', async (t) => {
  const env = await sent(t, (c) => c.logout('rt-1'))
  t.is(env.action, ACTIONS.AUTH_LOGOUT)
  t.alike(env.payload, { refreshToken: 'rt-1' })
})

test('listUsers - IDENTITY_USER_LIST with an empty payload', async (t) => {
  const env = await sent(t, (c) => c.listUsers())
  t.is(env.action, ACTIONS.IDENTITY_USER_LIST)
  t.alike(env.payload, {})
})

test('upsertUser - IDENTITY_USER_UPSERT sends the user as the payload', async (t) => {
  const user = { name: 'alice', email: 'a@example.com', groups: ['ops'] }
  const env = await sent(t, (c) => c.upsertUser(user))
  t.is(env.action, ACTIONS.IDENTITY_USER_UPSERT)
  t.alike(env.payload, user)
})

test('deleteUser - IDENTITY_USER_DELETE carries the name', async (t) => {
  const env = await sent(t, (c) => c.deleteUser('alice'))
  t.is(env.action, ACTIONS.IDENTITY_USER_DELETE)
  t.alike(env.payload, { name: 'alice' })
})

test('listServiceAccounts - IDENTITY_SA_LIST with an empty payload', async (t) => {
  const env = await sent(t, (c) => c.listServiceAccounts())
  t.is(env.action, ACTIONS.IDENTITY_SA_LIST)
  t.alike(env.payload, {})
})

test('upsertServiceAccount - IDENTITY_SA_UPSERT sends the account as the payload', async (t) => {
  const sa = { name: 'gw', publicKey: 'pk-hex' }
  const env = await sent(t, (c) => c.upsertServiceAccount(sa))
  t.is(env.action, ACTIONS.IDENTITY_SA_UPSERT)
  t.alike(env.payload, sa)
})

test('deleteServiceAccount - IDENTITY_SA_DELETE carries the name', async (t) => {
  const env = await sent(t, (c) => c.deleteServiceAccount('gw'))
  t.is(env.action, ACTIONS.IDENTITY_SA_DELETE)
  t.alike(env.payload, { name: 'gw' })
})

test('rotateSigningKey - IDENTITY_KEYS_ROTATE with an empty payload', async (t) => {
  const env = await sent(t, (c) => c.rotateSigningKey())
  t.is(env.action, ACTIONS.IDENTITY_KEYS_ROTATE)
  t.alike(env.payload, {})
})
