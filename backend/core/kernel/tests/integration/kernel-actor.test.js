'use strict'

// An app acting for an operator, through the Kernel's own issuer, authorizer,
// router, dispatcher and write-command log: the app's token in `auth`, the
// operator's in `actor`. Both must be allowed, and the log names the operator
// via the app.

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const KernelManager = require('../../lib/kernel.manager')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { routeEnvelope } = require('../../lib/transport/envelope-router')
const { generateCredential } = require('@tetherto/mdk-identity')
const { mintToken } = require('../../lib/testing')

const PASSWORD = 'correct horse battery'
const FAST = { scryptParams: { N: 1024, r: 8, p: 1 } }
const CALLER = { publicKey: 'ab'.repeat(32) }
const RBAC = {
  roles: [
    { name: 'app-console', rules: [{ resources: ['devices'], verbs: ['read', 'write'] }, { resources: ['commands'], verbs: ['read'] }] },
    { name: 'operator', rules: [{ resources: ['devices'], verbs: ['read', 'write'] }, { resources: ['commands'], verbs: ['read'] }] },
    { name: 'observer', rules: [{ resources: ['devices'], verbs: ['read'] }] }
  ],
  bindings: [
    { role: 'app-console', subjects: [{ kind: 'ServiceAccount', name: 'app:console' }] },
    { role: 'operator', subjects: [{ kind: 'User', name: 'alice' }] },
    { role: 'observer', subjects: [{ kind: 'User', name: 'bob' }] }
  ]
}

function createTmpDir (t) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-kernel-actor-'))
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

test('kernel-actor - the operator is authorized and logged, via the app', async (t) => {
  const tmpDir = createTmpDir(t)
  const kernel = new KernelManager({ kernel: { hrpc: false, identity: FAST } }, { storeDir: path.join(tmpDir, 'store'), root: tmpDir, loadConf: () => {}, rbac: RBAC })
  await kernel.init()
  await kernel.start()
  t.teardown(() => kernel.stop())

  const app = generateCredential()
  await kernel.identity.upsertServiceAccount({ name: 'app:console', publicKey: app.publicKey })
  const appToken = await mintToken(kernel.identity, { name: 'app:console', privateKey: app.privateKeyPem })
  for (const name of ['alice', 'bob']) await kernel.identity.upsertUser({ name, password: PASSWORD })
  const login = async (username) => (await kernel.identity.login({ username, password: PASSWORD })).accessToken

  const deps = { dispatcher: kernel.dispatcher, registry: kernel.registry, actionManager: kernel.actionManager, rbac: kernel.rbac, identity: kernel.identity, authorizer: kernel.authorizer }
  const send = (action, { deviceId, payload, actor } = {}) =>
    routeEnvelope(build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'gateway', deviceId, payload, auth: appToken, ...(actor ? { actor } : {}) }), deps, CALLER)

  // No worker owns the device, so the dispatcher rejects it, but only after the
  // authorizer allowed both; the attempt is logged either way.
  const alice = await send(ACTIONS.COMMAND_REQUEST, { deviceId: 'AM-001', payload: { command: 'reboot' }, actor: await login('alice') })
  t.ok(alice.error.startsWith('ERR_DEVICE_NOT_FOUND'), 'past the authorizer, to the dispatcher')

  const bob = await send(ACTIONS.COMMAND_REQUEST, { deviceId: 'AM-001', payload: { command: 'reboot' }, actor: await login('bob') })
  t.is(bob.error, 'ERR_KERNEL_ACTION_FORBIDDEN: bob (via app:console) may not write devices')

  const forged = await send(ACTIONS.COMMAND_REQUEST, { deviceId: 'AM-001', payload: { command: 'reboot' }, actor: appToken })
  t.ok(forged.error.startsWith('ERR_KERNEL_ACTOR_INVALID'), 'a service account token is not an operator')

  const { entries } = await send(ACTIONS.COMMAND_LOG, { payload: { limit: 10 } })
  const attempts = entries.map((e) => e.value || e).filter((e) => e.event === 'attempt').map((e) => [e.caller.key, e.via && e.via.key, e.caller.roles, e.error && e.error.split(':')[0]])
  t.alike(attempts.sort(), [
    ['alice', 'app:console', ['operator'], 'ERR_DEVICE_NOT_FOUND'],
    ['bob', 'app:console', ['observer'], 'ERR_KERNEL_ACTION_FORBIDDEN'],
    // An unverifiable operator is never named: the attempt is the app's own.
    ['app:console', undefined, ['app-console'], 'ERR_KERNEL_ACTOR_INVALID']
  ].sort())
})
