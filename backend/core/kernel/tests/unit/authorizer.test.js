'use strict'

const test = require('brittle')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { createTestAuth, mintToken } = require('../../lib/testing')
const { generateCredential, createAssertion } = require('@tetherto/mdk-identity')

// Two antminer workers and one avalon worker, as the registry names them.
const WORKERS = {
  'antminer-a': { family: 'miner', brand: 'antminer', devices: ['AM-001', 'AM-002'] },
  'antminer-b': { family: 'miner', brand: 'antminer', devices: ['AM-101'] },
  'avalon-a': { family: 'miner', brand: 'avalon', devices: ['AV-001', 'bad id!'] },
  'not-ready': { family: null, brand: null, devices: ['NR-1'] }
}
const registry = {
  resolveWorkerForDevice (deviceId) {
    for (const [workerId, w] of Object.entries(WORKERS)) if (w.devices.includes(deviceId)) return { workerId }
    return null
  },
  nameParts (workerId) {
    const w = WORKERS[workerId]
    return w && w.family ? { family: w.family, brand: w.brand, worker: workerId } : null
  },
  devicesOf (workerId) { return WORKERS[workerId] ? [...WORKERS[workerId].devices] : [] }
}
const COMMANDS = {
  'cmd-dev': { scope: 'device', deviceId: 'AM-001', workerId: 'antminer-a' },
  'cmd-worker': { scope: 'worker', workerId: 'antminer-a' }
}
const stateMachine = { async getState (id) { return COMMANDS[id] || null } }

const POLICY = {
  roles: [
    { name: 'tuner', rules: [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/*'] }] },
    { name: 'sentinel', rules: [{ resources: ['devices'], verbs: ['read'], resourceNames: ['miner/antminer/antminer-a/*'] }, { resources: ['workers'], verbs: ['list'] }] },
    { name: 'janitor', rules: [{ resources: ['workers'], verbs: ['delete'], resourceNames: ['miner/avalon/*'] }] },
    { name: 'voter', rules: [{ resources: ['actions'], verbs: ['delegate'] }] }
  ],
  bindings: [
    { role: 'tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:tuner' }] },
    { role: 'sentinel', subjects: [{ kind: 'ServiceAccount', name: 'app:sentinel' }] },
    { role: 'janitor', subjects: [{ kind: 'ServiceAccount', name: 'app:sentinel' }] },
    { role: 'voter', subjects: [{ kind: 'ServiceAccount', name: 'app:tuner' }] }
  ]
}

async function setup (t) {
  const auth = await createTestAuth({ registry, stateMachine, name: 'app:tuner', policy: POLICY })
  t.teardown(() => auth.close())
  const sentinel = generateCredential()
  await auth.identity.upsertServiceAccount({ name: 'app:sentinel', publicKey: sentinel.publicKey })
  const tokens = {
    tuner: await auth.token(),
    sentinel: await mintToken(auth.identity, { name: 'app:sentinel', privateKey: sentinel.privateKeyPem })
  }
  const decisions = []
  auth.authorizer.on('decision', (d) => decisions.push(d))
  const ask = (who, action, { deviceId, payload } = {}, caller = { publicKey: 'ab'.repeat(32) }) =>
    auth.authorizer.authorize(build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId, payload, auth: tokens[who] }), caller)
  return { auth, tokens, ask, decisions, sentinel }
}

test('device rules by family/brand/worker/device', async (t) => {
  const { ask } = await setup(t)
  t.ok((await ask('tuner', ACTIONS.COMMAND_REQUEST, { deviceId: 'AM-101', payload: { command: 'reboot' } })).allowed)
  const avalon = await ask('tuner', ACTIONS.COMMAND_REQUEST, { deviceId: 'AV-001', payload: { command: 'reboot' } })
  t.absent(avalon.allowed)
  t.is(avalon.error, 'ERR_KERNEL_ACTION_FORBIDDEN: app:tuner may not write devices miner/avalon/avalon-a/AV-001')

  t.ok((await ask('sentinel', ACTIONS.TELEMETRY_PULL, { deviceId: 'AM-002' })).allowed)
  t.absent((await ask('sentinel', ACTIONS.TELEMETRY_PULL, { deviceId: 'AM-101' })).allowed, 'antminer-b is out of scope')
  t.absent((await ask('sentinel', ACTIONS.COMMAND_REQUEST, { deviceId: 'AM-001', payload: { command: 'reboot' } })).allowed, 'read only')
})

test('unknown devices, unready workers and odd ids never match a scoped rule', async (t) => {
  const { ask } = await setup(t)
  for (const deviceId of ['ghost', 'NR-1', 'bad id!', undefined]) {
    t.absent((await ask('tuner', ACTIONS.STATE_PULL, { deviceId })).allowed, String(deviceId))
  }
})

test('a worker- or rack-scoped command is checked for every device the worker owns', async (t) => {
  const { ask } = await setup(t)
  t.ok((await ask('tuner', ACTIONS.COMMAND_REQUEST, { payload: { command: 'reboot', scope: 'worker', workerId: 'antminer-a' } })).allowed)
  t.absent((await ask('tuner', ACTIONS.COMMAND_REQUEST, { payload: { command: 'reboot', scope: 'rack', workerId: 'avalon-a' } })).allowed)
  t.absent((await ask('tuner', ACTIONS.COMMAND_REQUEST, { payload: { command: 'reboot', scope: 'worker', workerId: 'nobody' } })).allowed, 'no devices: unscoped rules only')
})

test('command status and cancel are checked against the command target', async (t) => {
  const { ask } = await setup(t)
  t.ok((await ask('sentinel', ACTIONS.COMMAND_STATUS, { payload: { commandId: 'cmd-dev' } })).allowed)
  t.absent((await ask('sentinel', ACTIONS.COMMAND_CANCEL, { payload: { commandId: 'cmd-dev' } })).allowed, 'cancel is a write')
  t.ok((await ask('tuner', ACTIONS.COMMAND_CANCEL, { payload: { commandId: 'cmd-worker' } })).allowed)
  t.absent((await ask('tuner', ACTIONS.COMMAND_STATUS, { payload: { commandId: 'gone' } })).allowed)
})

test('worker rules by family/brand/worker; unscoped actions', async (t) => {
  const { ask } = await setup(t)
  t.ok((await ask('sentinel', ACTIONS.WORKER_TERMINATE, { payload: { workerId: 'avalon-a' } })).allowed)
  t.absent((await ask('sentinel', ACTIONS.WORKER_TERMINATE, { payload: { workerId: 'antminer-a' } })).allowed)
  t.ok((await ask('sentinel', ACTIONS.WORKER_LIST)).allowed)
  t.absent((await ask('tuner', ACTIONS.WORKER_LIST)).allowed)
  t.absent((await ask('tuner', ACTIONS.RBAC_APPLY, { payload: { rbac: null } })).allowed)
})

test('tokens: required, verified, bound to the caller', async (t) => {
  const { auth, ask } = await setup(t)
  t.ok((await ask('nobody', ACTIONS.WORKER_LIST)).error.startsWith('ERR_KERNEL_TOKEN_REQUIRED'))
  t.ok((await ask('tuner', ACTIONS.AUTH_JWKS)).allowed, 'sign-in needs none')

  const caller = 'cd'.repeat(32)
  const assertion = createAssertion({ name: auth.credential.name, privateKey: auth.credential.privateKey })
  const bound = (await auth.identity.token({ assertion, cnf: caller })).accessToken
  const env = (token) => build({ action: ACTIONS.STATE_PULL, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId: 'AM-001', auth: token })
  t.ok((await auth.authorizer.authorize(env(bound), { publicKey: caller })).allowed)
  const stolen = await auth.authorizer.authorize(env(bound), { publicKey: 'ef'.repeat(32) })
  t.is(stolen.error, 'ERR_KERNEL_TOKEN_INVALID: ERR_IDENTITY_TOKEN_BINDING', 'a bound token used from another key')
  t.ok((await auth.authorizer.authorize(env('x.y.z'), { publicKey: caller })).error.startsWith('ERR_KERNEL_TOKEN_INVALID'))
})

test('delegation and device checks for action pushes; decisions are emitted', async (t) => {
  const { auth, ask, decisions } = await setup(t)
  const tuner = { kind: 'serviceaccount', sub: 'app:tuner' }
  const sentinel = { kind: 'serviceaccount', sub: 'app:sentinel' }
  t.ok(auth.authorizer.canDelegate(tuner))
  t.absent(auth.authorizer.canDelegate(sentinel))
  t.ok(auth.authorizer.canWriteDevice(tuner, 'AM-001'))
  t.absent(auth.authorizer.canWriteDevice(tuner, 'AV-001'))

  await ask('tuner', ACTIONS.STATE_PULL, { deviceId: 'AV-001' })
  const last = decisions.at(-1)
  t.alike({ allowed: last.allowed, sub: last.sub, action: last.action, resourceName: last.resourceName }, {
    allowed: false, sub: 'app:tuner', action: 'state.pull', resourceName: 'miner/avalon/avalon-a/AV-001'
  })
  t.ok(last.policyVersion)
})

// An app acting for operators: alice may tune antminers, bob may only read
// antminer-a. The app's own grant and the operator's must both allow a call.
const ACTOR_POLICY = {
  roles: POLICY.roles,
  bindings: [
    { role: 'tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:tuner' }, { kind: 'User', name: 'alice' }] },
    { role: 'sentinel', subjects: [{ kind: 'ServiceAccount', name: 'app:sentinel' }, { kind: 'User', name: 'bob' }] }
  ]
}
const PASSWORD = 'correct-horse-battery'

async function setupActors (t) {
  const auth = await createTestAuth({ registry, stateMachine, name: 'app:tuner', policy: ACTOR_POLICY })
  t.teardown(() => auth.close())
  const sentinel = generateCredential()
  await auth.identity.upsertServiceAccount({ name: 'app:sentinel', publicKey: sentinel.publicKey })
  for (const name of ['alice', 'bob']) await auth.identity.upsertUser({ name, password: PASSWORD })
  const login = async (username) => (await auth.identity.login({ username, password: PASSWORD })).accessToken
  const tokens = {
    tuner: await auth.token(),
    sentinel: await mintToken(auth.identity, { name: 'app:sentinel', privateKey: sentinel.privateKeyPem }),
    alice: await login('alice'),
    bob: await login('bob')
  }
  const decisions = []
  auth.authorizer.on('decision', (d) => decisions.push(d))
  const ask = (who, actor, action, { deviceId, payload } = {}) =>
    auth.authorizer.authorize(build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId, payload, auth: tokens[who], actor: tokens[actor] || actor }), { publicKey: 'ab'.repeat(32) })
  return { auth, tokens, ask, decisions, login }
}

test('actor: allowed only when both the app and the operator are', async (t) => {
  const { ask, decisions } = await setupActors(t)
  const reboot = (deviceId) => ({ deviceId, payload: { command: 'reboot' } })

  const ok = await ask('tuner', 'alice', ACTIONS.COMMAND_REQUEST, reboot('AM-101'))
  t.ok(ok.allowed)
  t.alike(ok.identity, { kind: 'serviceaccount', sub: 'app:tuner' })
  t.alike(ok.actor, { kind: 'user', sub: 'alice' })
  t.alike([decisions.at(-1).actorSub, decisions.at(-1).actorRoles], ['alice', ['tuner']], 'the decision names the operator')

  const bob = await ask('tuner', 'bob', ACTIONS.COMMAND_REQUEST, reboot('AM-001'))
  t.absent(bob.allowed, 'the app may, the operator may not')
  t.is(bob.error, 'ERR_KERNEL_ACTION_FORBIDDEN: bob (via app:tuner) may not write devices miner/antminer/antminer-a/AM-001')
  t.is(decisions.at(-1).actorSub, 'bob')

  const app = await ask('sentinel', 'alice', ACTIONS.COMMAND_REQUEST, reboot('AM-001'))
  t.absent(app.allowed, 'the operator may, the app may not')
  t.is(app.error, 'ERR_KERNEL_ACTION_FORBIDDEN: app:sentinel may not write devices miner/antminer/antminer-a/AM-001')

  t.ok((await ask('sentinel', 'bob', ACTIONS.TELEMETRY_PULL, { deviceId: 'AM-002' })).allowed)
  t.absent((await ask('sentinel', 'bob', ACTIONS.TELEMETRY_PULL, { deviceId: 'AM-101' })).allowed)
})

test('actor: only a current, unbound user token from this issuer', async (t) => {
  const { auth, tokens, ask } = await setupActors(t)
  const pull = { deviceId: 'AM-001' }

  t.is((await ask('tuner', tokens.sentinel, ACTIONS.STATE_PULL, pull)).error, 'ERR_KERNEL_ACTOR_INVALID: ERR_IDENTITY_TOKEN_CLAIMS', 'a service account is no operator')
  const assertion = createAssertion({ name: auth.credential.name, privateKey: auth.credential.privateKey })
  const bound = (await auth.identity.token({ assertion, cnf: 'ab'.repeat(32) })).accessToken
  t.ok((await ask('tuner', bound, ACTIONS.STATE_PULL, pull)).error.startsWith('ERR_KERNEL_ACTOR_INVALID'), 'nor is a bound token')
  t.ok((await ask('tuner', 'x.y.z', ACTIONS.STATE_PULL, pull)).error.startsWith('ERR_KERNEL_ACTOR_INVALID'))

  await auth.identity.upsertUser({ name: 'alice', password: 'a-brand-new-password' })
  t.is((await ask('tuner', 'alice', ACTIONS.STATE_PULL, pull)).error, 'ERR_KERNEL_ACTOR_INVALID: ERR_IDENTITY_TOKEN_REVOKED', 'revoked with the password change')

  const alone = await auth.authorizer.authorize(build({ action: ACTIONS.STATE_PULL, type: MESSAGE_TYPES.REQUEST, sender: 'x', deviceId: 'AM-001', actor: tokens.bob }), { publicKey: 'ab'.repeat(32) })
  t.ok(alone.error.startsWith('ERR_KERNEL_TOKEN_REQUIRED'), 'an operator token is never enough on its own')
})

test('actor: device writes for action pushes need both', async (t) => {
  const { auth } = await setupActors(t)
  const tuner = { kind: 'serviceaccount', sub: 'app:tuner' }
  t.ok(auth.authorizer.canWriteDevice(tuner, 'AM-001', { kind: 'user', sub: 'alice' }))
  t.absent(auth.authorizer.canWriteDevice(tuner, 'AM-001', { kind: 'user', sub: 'bob' }))
  t.absent(auth.authorizer.canWriteDevice({ kind: 'serviceaccount', sub: 'app:sentinel' }, 'AM-001', { kind: 'user', sub: 'alice' }))
})
