'use strict'

const test = require('brittle')
const { compilePolicy, kernelRequest, IDENTITY_KIND, IDENTITY_KINDS, DENY_IDENTITY, DENY_REQUEST, DENY_NO_RULE } = require('../../index')
const stackRbac = require('../fixtures/stack-rbac')

const user = (sub, extra = {}) => ({ kind: 'user', sub, ...extra })
const sa = (sub) => ({ kind: 'serviceaccount', sub })
const ANTMINER_A = 'miner/antminer/antminer-a/AM-001'
const ANTMINER_B = 'miner/antminer/antminer-b/AM-101'
const AVALON_A = 'miner/avalon/avalon-a/AV-001'

test('admin is an ordinary wildcard role: routes and devices alike', (t) => {
  const rbac = compilePolicy(stackRbac())
  const admin = user('u-1', { email: 'ankit@example.com' })
  const d = rbac.evaluate(admin, { resource: 'sentinel/settings', verb: 'delete' })
  t.ok(d.allowed)
  t.is(d.role, 'admin')
  t.ok(rbac.allows(admin, kernelRequest('command.request', AVALON_A)))
  t.ok(rbac.allows(admin, kernelRequest('worker.terminate', 'miner/avalon/avalon-a')))
})

test('viewer reads every route, including ones installed later, and no device', (t) => {
  const rbac = compilePolicy(stackRbac())
  const viewer = user('u-2', { groups: ['ops-team'] })
  t.ok(rbac.allows(viewer, { resource: 'ops-center/miners', verb: 'list' }))
  t.ok(rbac.allows(viewer, { resource: 'some-future-app/reports/daily', verb: 'get' }))
  t.absent(rbac.allows(viewer, { resource: 'ops-center/miners/command', verb: 'create' }))
  t.absent(rbac.allows(viewer, kernelRequest('telemetry.pull', ANTMINER_A)), 'get/list are not Kernel verbs')
})

test('an agent service account gets exactly its role', (t) => {
  const rbac = compilePolicy(stackRbac())
  const agent = sa('operator-agent')
  t.ok(rbac.allows(agent, { resource: 'ops-center/miners/command', verb: 'create' }))
  t.absent(rbac.allows(agent, { resource: 'ops-center/miners', verb: 'delete' }))
  t.absent(rbac.allows(agent, { resource: 'sentinel/settings', verb: 'get' }))
  t.absent(rbac.allows(agent, kernelRequest('telemetry.pull', ANTMINER_A)))
})

test('resourceNames scope a rule to instances; a request without a name never matches it', (t) => {
  const rbac = compilePolicy(stackRbac())
  const tech = user('u-3', { email: 'tech@example.com' })
  const route = { resource: 'ops-center/miners/command', verb: 'create' }
  t.ok(rbac.allows(tech, { ...route, resourceName: 'rack-3-07' }))
  t.absent(rbac.allows(tech, { ...route, resourceName: 'rack-4-01' }))
  t.absent(rbac.allows(tech, route))
})

test('allowsSome: a rule scoped to instances covers the resource for listing, not the call', (t) => {
  const rbac = compilePolicy(stackRbac())
  const tech = user('u-3', { email: 'tech@example.com' })
  const route = { resource: 'ops-center/miners/command', verb: 'create' }
  t.ok(rbac.allowsSome(tech, route), 'some instance is allowed, so the tool is listed')
  t.absent(rbac.allows(tech, route), 'and the call itself still needs a matching name')
  t.absent(rbac.allowsSome(tech, { ...route, verb: 'delete' }), 'a verb no rule grants')
  t.absent(rbac.allowsSome(user('nobody'), route), 'an unbound subject')
  t.absent(rbac.allowsSome(null, route))
})

test('app device rules by family/brand/worker/device', (t) => {
  const rbac = compilePolicy(stackRbac())
  const ops = sa('app:ops-center')
  const tuner = sa('app:antminer-tuner')
  const sentinel = sa('app:sentinel')

  for (const dev of [ANTMINER_A, ANTMINER_B, AVALON_A]) t.ok(rbac.allows(ops, kernelRequest('command.request', dev)), `ops-center → ${dev}`)

  t.ok(rbac.allows(tuner, kernelRequest('command.request', ANTMINER_B)))
  t.absent(rbac.allows(tuner, kernelRequest('command.request', AVALON_A)))

  t.ok(rbac.allows(sentinel, kernelRequest('state.pull', ANTMINER_A)))
  t.absent(rbac.allows(sentinel, kernelRequest('state.pull', ANTMINER_B)))

  t.absent(rbac.allows(ops, kernelRequest('worker.list')), 'devices rules do not cover workers')
  t.absent(rbac.allows(ops, { resource: 'ops-center/miners', verb: 'list' }), 'an app has no route access by default')
})

test('subject kinds do not cross: a user cannot match a service account binding or vice versa', (t) => {
  const rbac = compilePolicy(stackRbac())
  t.absent(rbac.allows(user('app:ops-center'), kernelRequest('state.pull', ANTMINER_A)))
  t.absent(rbac.allows(sa('ankit@example.com'), { resource: 'ops-center/miners', verb: 'list' }))
})

test('no bypass: claims outside the bindings grant nothing', (t) => {
  const rbac = compilePolicy(stackRbac())
  const claims = user('mallory', { admin: true, superadmin: true, roles: ['admin'], perms: ['*'], scope: '*' })
  const d = rbac.evaluate(claims, { resource: 'ops-center/miners', verb: 'get' })
  t.absent(d.allowed)
  t.is(d.reason, DENY_NO_RULE)
})

test('absent or empty policy denies everything', (t) => {
  for (const rbac of [compilePolicy(undefined), compilePolicy(null), compilePolicy({}), compilePolicy({ roles: [], bindings: [] })]) {
    t.absent(rbac.allows(user('anyone'), { resource: 'ops-center/miners', verb: 'get' }))
    t.absent(rbac.allows(sa('app:ops-center'), kernelRequest('state.pull', ANTMINER_A)))
  }
})

test('malformed identities and requests are denied, never thrown', (t) => {
  const rbac = compilePolicy(stackRbac())
  const admin = user('u-1', { email: 'ankit@example.com' })

  for (const id of [null, undefined, {}, { kind: 'root', sub: 'x' }, user(''), user('*'), { kind: 'user' }]) {
    t.is(rbac.evaluate(id, { resource: 'ops-center/miners', verb: 'get' }).reason, DENY_IDENTITY)
  }
  const bad = [
    null,
    { resource: '*', verb: 'get' },
    { resource: 'ops-center/*', verb: 'get' },
    { resource: 'ops-center/miners', verb: '*' },
    { resource: 'ops-center/miners', verb: 'read' },
    { resource: 'devices', verb: 'get', resourceName: ANTMINER_A },
    { resource: 'ops-center//miners', verb: 'get' },
    { resource: 'devices', verb: 'write', resourceName: 'miner/*' },
    { resource: 'devices', verb: 'write', resourceName: '' }
  ]
  for (const req of bad) t.is(rbac.evaluate(admin, req).reason, DENY_REQUEST, JSON.stringify(req))
})

test('unknown Kernel actions have no request to evaluate', (t) => {
  t.is(kernelRequest('identity.request'), null)
  t.is(kernelRequest('something.new', ANTMINER_A), null)
})

test('decisions are frozen and carry a stable policy version', (t) => {
  const a = compilePolicy(stackRbac())
  const b = compilePolicy(stackRbac())
  const changed = stackRbac()
  changed.roles[0].rules[0].verbs = ['get']
  const d = a.evaluate(user('u-1', { email: 'ankit@example.com' }), { resource: 'x/y', verb: 'get' })
  t.ok(Object.isFrozen(d))
  t.is(d.policyVersion, a.version)
  t.is(a.version, b.version)
  t.not(a.version, compilePolicy(changed).version)
})

test('rolesFor lists bound roles in policy order', (t) => {
  const rbac = compilePolicy(stackRbac())
  t.alike(rbac.rolesFor(user('u-9', { email: 'ankit@example.com', groups: ['ops-team'] })), ['viewer', 'admin'])
  t.alike(rbac.rolesFor(sa('nobody')), [])
  t.alike(rbac.rolesFor(null), [])
})

test('IDENTITY_KIND names every identity kind the evaluator accepts', (t) => {
  t.is(IDENTITY_KIND.USER, 'user')
  t.is(IDENTITY_KIND.SERVICEACCOUNT, 'serviceaccount')
  t.alike([...IDENTITY_KINDS].sort(), Object.values(IDENTITY_KIND).sort())
  t.ok(Object.isFrozen(IDENTITY_KIND))
})
