'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const KernelManager = require('../../lib/kernel.manager')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build } = require('../../lib/protocol/envelope')
const { routeEnvelope } = require('../../lib/transport/envelope-router')
const { createAssertion, generateCredential, createVerifier } = require('@tetherto/mdk-identity')
const { grantTestToken } = require('../../lib/testing')

const PASSWORD = 'correct horse battery'
const FAST = { scryptParams: { N: 1024, r: 8, p: 1 } }
const CALLER = { publicKey: 'ab'.repeat(32), roles: ['admin'] }

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-kernel-identity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

async function boot (tmpDir, ctx = {}) {
  const kernel = new KernelManager({ kernel: { hrpc: false, identity: FAST } }, { storeDir: path.join(tmpDir, 'store'), root: tmpDir, loadConf: () => {}, ...ctx })
  await kernel.init()
  await kernel.start()
  return kernel
}

// Calls as an HRPC caller would: through the Kernel's own authorizer, with a
// token for a service account the policy binds to full access.
async function call (kernel, action, payload) {
  if (!kernel._testToken) kernel._testToken = await grantTestToken(kernel)
  const envelope = build({ action, type: MESSAGE_TYPES.REQUEST, sender: 'cli', payload, auth: kernel._testToken })
  return routeEnvelope(envelope, { identity: kernel.identity, authorizer: kernel.authorizer }, CALLER)
}

test('kernel-identity - users sign in over the protocol; tokens verify from the JWKS', async (t) => {
  const kernel = await boot(createTmpDir(t))
  t.ok((await call(kernel, ACTIONS.IDENTITY_USER_UPSERT, { name: 'ankit', email: 'ankit@example.com', password: PASSWORD })).created)
  const tokens = await call(kernel, ACTIONS.AUTH_LOGIN, { username: 'ankit', password: PASSWORD })
  t.ok(tokens.accessToken)
  t.is(kernel.verifyToken(tokens.accessToken).email, 'ankit@example.com')

  const jwks = await call(kernel, ACTIONS.AUTH_JWKS, {})
  t.is(createVerifier({ jwks }).verify(tokens.accessToken).sub, 'ankit', 'another process verifies with the published keys')

  const refreshed = await call(kernel, ACTIONS.AUTH_REFRESH, { refreshToken: tokens.refreshToken })
  t.ok(refreshed.accessToken)
  // Seconds later the old refresh token is another client refreshing at once: it gets the same successor.
  t.is((await call(kernel, ACTIONS.AUTH_REFRESH, { refreshToken: tokens.refreshToken })).refreshToken, refreshed.refreshToken)
  await kernel.stop()
})

test('kernel-identity - ctx.serviceAccounts is the exact registered set; app tokens bind to the caller', async (t) => {
  const tmpDir = createTmpDir(t)
  const app = generateCredential()
  const agent = generateCredential()
  const first = await boot(tmpDir, { serviceAccounts: [{ name: 'app:ops-center', publicKey: app.publicKey }, { name: 'operator-agent', publicKey: agent.publicKey }] })
  const tokens = await call(first, ACTIONS.AUTH_TOKEN, { assertion: createAssertion({ name: 'app:ops-center', privateKey: app.privateKeyPem }) })
  t.alike(first.verifyToken(tokens.accessToken, { cnf: CALLER.publicKey }).cnf, { hrpc: CALLER.publicKey })
  await first.stop()

  // Restart without the agent: it is removed, and its sign-in fails.
  const second = await boot(tmpDir, { serviceAccounts: [{ name: 'app:ops-center', publicKey: app.publicKey }] })
  t.alike((await call(second, ACTIONS.IDENTITY_SA_LIST, {})).serviceAccounts.map((s) => s.name).filter((n) => n !== 'test-admin'), ['app:ops-center'])
  const refused = await call(second, ACTIONS.AUTH_TOKEN, { assertion: createAssertion({ name: 'operator-agent', privateKey: agent.privateKeyPem }), bind: false })
  t.ok(refused.error.includes('unknown service account'))
  t.ok(second.verifyToken(tokens.accessToken, { cnf: CALLER.publicKey }), 'the signing key survived the restart')
  await second.stop()

  // Without ctx.serviceAccounts the registered set is kept.
  const third = await boot(tmpDir)
  t.alike((await third.identity.listServiceAccounts()).map((s) => s.name).filter((n) => n !== 'test-admin'), ['app:ops-center'])
  await third.stop()
})

test('kernel-identity - a malformed service-account list refuses the boot', async (t) => {
  const kernel = new KernelManager({ kernel: { hrpc: false } }, { storeDir: path.join(createTmpDir(t), 'store'), loadConf: () => {}, serviceAccounts: 'nope' })
  await t.exception(kernel.init(), /ERR_KERNEL_SERVICE_ACCOUNTS_INVALID/)
})

test('kernel-identity - a bad key in the list fails start, not later', async (t) => {
  const kernel = new KernelManager({ kernel: { hrpc: false, identity: FAST } }, { storeDir: path.join(createTmpDir(t), 'store'), loadConf: () => {}, serviceAccounts: [{ name: 'app:x', publicKey: 'zz' }] })
  await kernel.init()
  await t.exception(kernel.start(), /ERR_IDENTITY_KEY_INVALID/)
  await kernel.stores.close()
})
