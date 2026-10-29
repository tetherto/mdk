'use strict'

const test = require('brittle')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { routeEnvelope } = require('../../lib/transport/envelope-router')
const { CALLER_ACTIONS } = require('../../lib/transport/caller-auth')
const { fakeAuthorizer } = require('../helpers/fake-authorizer')

function fakeRbac () {
  const applied = []
  let record = null
  return {
    applied,
    info: () => record,
    async apply (rbac, meta) {
      if (rbac && rbac.enforcement === 'allow') {
        const err = new Error('ERR_RBAC_POLICY_INVALID: 1 problem(s)')
        err.errors = ['spec.rbac.enforcement: must be "deny"']
        throw err
      }
      applied.push({ rbac, meta })
      record = { version: `v${applied.length}`, appliedAt: 'now', previous: record ? record.version : null, policy: rbac }
      return { changed: true, record }
    }
  }
}

const envelope = (action, payload) => build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'cli', payload })
const admin = { publicKey: 'ab'.repeat(32) }
const authorizer = fakeAuthorizer({ sub: 'ankit@example.com' })

test('rbac actions are caller actions', (t) => {
  t.ok(CALLER_ACTIONS.includes(ACTIONS.RBAC_GET) && CALLER_ACTIONS.includes(ACTIONS.RBAC_APPLY), 'callers may send them; spec.rbac decides who')
})

test('rbac.get returns the record in force', async (t) => {
  const rbac = fakeRbac()
  t.alike(await routeEnvelope(envelope(ACTIONS.RBAC_GET, {}), { rbac, authorizer }, admin), { record: null })
  const denied = await routeEnvelope(envelope(ACTIONS.RBAC_GET, {}), { rbac, authorizer: fakeAuthorizer({ allow: () => false }) }, admin)
  t.ok(denied.error.startsWith('ERR_KERNEL_ACTION_FORBIDDEN'))

  // With an issuer, every subject's token version too: remote verifiers poll them.
  const identity = { tokenVersions: () => ({ 'user:u': 'v1' }) }
  t.alike(await routeEnvelope(envelope(ACTIONS.RBAC_GET, {}), { rbac, identity, authorizer }, admin), { record: null, tokenVersions: { 'user:u': 'v1' } })
})

test('rbac.apply applies and records the caller', async (t) => {
  const rbac = fakeRbac()
  const res = await routeEnvelope(envelope(ACTIONS.RBAC_APPLY, { rbac: { roles: [] } }), { rbac, authorizer }, admin)
  t.alike(res, { changed: true, version: 'v1', appliedAt: 'now', previous: null })
  t.alike(rbac.applied[0].meta, { source: 'apply', by: 'ankit@example.com' })
})

test('rbac.apply by an operator records them, via the app', async (t) => {
  const rbac = fakeRbac()
  const req = build({ action: ACTIONS.RBAC_APPLY, type: MESSAGE_TYPES.REQUEST, sender: 'cli', payload: { rbac: { roles: [] } }, auth: 't', actor: 'alice' })
  await routeEnvelope(req, { rbac, authorizer: fakeAuthorizer({ sub: 'app:console' }) }, admin)
  t.alike(rbac.applied[0].meta, { source: 'apply', by: 'alice', via: 'app:console' })
})

test('rbac.apply hands back every validation problem', async (t) => {
  const rbac = fakeRbac()
  const res = await routeEnvelope(envelope(ACTIONS.RBAC_APPLY, { rbac: { enforcement: 'allow' } }), { rbac, authorizer }, admin)
  t.ok(res.error.startsWith('ERR_RBAC_POLICY_INVALID'))
  t.alike(res.errors, ['spec.rbac.enforcement: must be "deny"'])
})

test('rbac.apply needs a payload carrying rbac', async (t) => {
  const rbac = fakeRbac()
  t.is((await routeEnvelope(envelope(ACTIONS.RBAC_APPLY, {}), { rbac, authorizer }, admin)).error, 'ERR_PAYLOAD_RBAC_REQUIRED')
  t.ok((await routeEnvelope(envelope(ACTIONS.RBAC_APPLY, { rbac: [] }), { rbac, authorizer }, admin)).error.startsWith('ERR_PAYLOAD_RBAC_INVALID'))
  t.is(rbac.applied.length, 0)
  const ok = await routeEnvelope(envelope(ACTIONS.RBAC_APPLY, { rbac: null }), { rbac, authorizer }, admin)
  t.ok(ok.changed, 'null applies the deny-all policy')
})

test('rbac actions without a policy store', async (t) => {
  t.is((await routeEnvelope(envelope(ACTIONS.RBAC_GET, {}), { authorizer }, admin)).error, 'ERR_KERNEL_NO_RBAC')
  t.is((await routeEnvelope(envelope(ACTIONS.RBAC_APPLY, { rbac: null }), { authorizer }, admin)).error, 'ERR_KERNEL_NO_RBAC')
})
