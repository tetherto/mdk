'use strict'

const test = require('brittle')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { routeEnvelope } = require('../../lib/transport/envelope-router')
const { CALLER_ACTIONS } = require('../../lib/transport/caller-auth')
const { fakeAuthorizer } = require('../helpers/fake-authorizer')

const envelope = (action, payload = {}) => build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'gateway', payload })
const reader = { publicKey: 'ab'.repeat(32), roles: ['read'] }
const admin = { publicKey: 'cd'.repeat(32), roles: ['admin'] }

function fakeIdentity () {
  const calls = []
  const rec = (name) => async (args) => { calls.push([name, args]); return { ok: name } }
  return {
    calls,
    login: rec('login'),
    refresh: rec('refresh'),
    token: rec('token'),
    logout: rec('logout'),
    jwks: () => ({ keys: [{ kid: 'k' }] }),
    listUsers: async () => [{ name: 'u' }],
    upsertUser: rec('upsertUser'),
    deleteUser: async () => true,
    listServiceAccounts: async () => [{ name: 'app:x' }],
    upsertServiceAccount: rec('upsertServiceAccount'),
    deleteServiceAccount: async () => false,
    rotateSigningKey: async () => ({ kid: 'k2' })
  }
}

test('sign-in and administration are caller actions; spec.rbac decides who may administer', (t) => {
  for (const a of [ACTIONS.AUTH_LOGIN, ACTIONS.AUTH_REFRESH, ACTIONS.AUTH_TOKEN, ACTIONS.AUTH_LOGOUT, ACTIONS.AUTH_JWKS, ACTIONS.IDENTITY_USER_LIST,
    ACTIONS.IDENTITY_USER_UPSERT, ACTIONS.IDENTITY_USER_DELETE, ACTIONS.IDENTITY_SA_LIST, ACTIONS.IDENTITY_SA_UPSERT, ACTIONS.IDENTITY_SA_DELETE,
    ACTIONS.IDENTITY_KEYS_ROTATE]) t.ok(CALLER_ACTIONS.includes(a), a)
})

test('auth.token binds to the caller unless it asks for bearer tokens; refresh passes the caller key', async (t) => {
  const identity = fakeIdentity()
  await routeEnvelope(envelope(ACTIONS.AUTH_TOKEN, { assertion: 'a.b.c' }), { identity, authorizer: fakeAuthorizer() }, reader)
  await routeEnvelope(envelope(ACTIONS.AUTH_TOKEN, { assertion: 'a.b.c', bind: false }), { identity, authorizer: fakeAuthorizer() }, reader)
  await routeEnvelope(envelope(ACTIONS.AUTH_REFRESH, { refreshToken: 'r' }), { identity, authorizer: fakeAuthorizer() }, reader)
  await routeEnvelope(envelope(ACTIONS.AUTH_LOGIN, { username: 'u', password: 'p' }), { identity, authorizer: fakeAuthorizer() }, reader)
  t.alike(identity.calls, [
    ['token', { assertion: 'a.b.c', cnf: reader.publicKey }],
    ['token', { assertion: 'a.b.c', cnf: undefined }],
    ['refresh', { refreshToken: 'r', cnf: reader.publicKey }],
    ['login', { username: 'u', password: 'p' }]
  ])
})

test('routes administration and JWKS', async (t) => {
  const identity = fakeIdentity()
  const r = (action, payload) => routeEnvelope(envelope(action, payload), { identity, authorizer: fakeAuthorizer() }, admin)
  t.alike(await r(ACTIONS.AUTH_JWKS), { keys: [{ kid: 'k' }] })
  t.alike(await r(ACTIONS.IDENTITY_USER_LIST), { users: [{ name: 'u' }] })
  t.alike(await r(ACTIONS.IDENTITY_USER_DELETE, { name: 'u' }), { deleted: true })
  t.alike(await r(ACTIONS.IDENTITY_SA_LIST), { serviceAccounts: [{ name: 'app:x' }] })
  t.alike(await r(ACTIONS.IDENTITY_SA_DELETE, { name: 'x' }), { deleted: false })
  t.alike(await r(ACTIONS.IDENTITY_KEYS_ROTATE), { kid: 'k2' })
  await r(ACTIONS.IDENTITY_USER_UPSERT, { name: 'u', groups: ['g'], extra: 'dropped' })
  await r(ACTIONS.IDENTITY_SA_UPSERT, { name: 'app:x', publicKey: 'k' })
  t.alike(identity.calls.map((c) => c[1]), [
    { name: 'u', email: undefined, groups: ['g'], password: undefined, disabled: undefined },
    { name: 'app:x', publicKey: 'k' }
  ])
})

test('administration the policy does not grant is refused before the issuer', async (t) => {
  const identity = fakeIdentity()
  const authorizer = fakeAuthorizer({ allow: (a) => !a.startsWith('identity.') })
  const res = await routeEnvelope(envelope(ACTIONS.IDENTITY_USER_UPSERT, { name: 'u' }), { identity, authorizer }, reader)
  t.ok(res.error.startsWith('ERR_KERNEL_ACTION_FORBIDDEN'))
  t.is(identity.calls.length, 0)
})

test('issuer errors come back as replies; payloads are shape-checked first', async (t) => {
  const identity = { ...fakeIdentity(), login: async () => { throw new Error('ERR_IDENTITY_INVALID_CREDENTIALS') } }
  t.alike(await routeEnvelope(envelope(ACTIONS.AUTH_LOGIN, { username: 'u', password: 'secret-value' }), { identity, authorizer: fakeAuthorizer() }, reader), { error: 'ERR_IDENTITY_INVALID_CREDENTIALS' })
  t.alike(await routeEnvelope(envelope(ACTIONS.AUTH_LOGIN, { username: 'u' }), { identity, authorizer: fakeAuthorizer() }, reader), { error: 'ERR_PAYLOAD_FIELD_REQUIRED: password' })
  t.alike(await routeEnvelope(envelope(ACTIONS.AUTH_TOKEN, { assertion: 'x', bind: 'no' }), { identity, authorizer: fakeAuthorizer() }, reader), { error: 'ERR_PAYLOAD_INVALID: bind must be a boolean' })
  t.alike(await routeEnvelope(envelope(ACTIONS.AUTH_JWKS), { authorizer: fakeAuthorizer() }, reader), { error: 'ERR_KERNEL_NO_IDENTITY' })
})
