'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const KernelManager = require('../../lib/kernel.manager')

const RBAC = {
  roles: [
    { name: 'admin', rules: [{ resources: ['*'], verbs: ['*'] }] },
    { name: 'app-sentinel', rules: [{ resources: ['devices'], verbs: ['read'], resourceNames: ['miner/antminer/antminer-a/*'] }] }
  ],
  bindings: [
    { role: 'admin', subjects: [{ kind: 'User', name: 'ankit@example.com' }] },
    { role: 'app-sentinel', subjects: [{ kind: 'ServiceAccount', name: 'app:sentinel' }] }
  ]
}
const SENTINEL = { kind: 'serviceaccount', sub: 'app:sentinel' }
const READ_A = { resource: 'devices', verb: 'read', resourceName: 'miner/antminer/antminer-a/AM-001' }

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-kernel-rbac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

async function boot (tmpDir, ctx = {}) {
  const kernel = new KernelManager({ kernel: { hrpc: false } }, { storeDir: path.join(tmpDir, 'store'), root: tmpDir, loadConf: () => {}, ...ctx })
  await kernel.init()
  await kernel.start()
  return kernel
}

test('kernel-rbac - boots with no policy and denies everything', async (t) => {
  const kernel = await boot(createTmpDir(t))
  t.is(kernel.getRbac(), null)
  t.absent(kernel.rbac.current().allows(SENTINEL, READ_A))
  await kernel.stop()
})

test('kernel-rbac - ctx.rbac is applied at boot and kept across restarts', async (t) => {
  const tmpDir = createTmpDir(t)
  const first = await boot(tmpDir, { rbac: RBAC })
  const record = first.getRbac()
  t.is(record.source, 'boot')
  t.ok(first.rbac.current().allows(SENTINEL, READ_A))
  await first.stop()

  // No stack file this time: the last applied policy is reloaded.
  const second = await boot(tmpDir)
  t.is(second.getRbac().version, record.version)
  t.ok(second.rbac.current().allows(SENTINEL, READ_A))
  await second.stop()

  // Same policy again: nothing new is recorded.
  const third = await boot(tmpDir, { rbac: RBAC })
  t.is((await third.rbac.history()).length, 1)
  await third.stop()
})

test('kernel-rbac - a stack with no rbac (null) replaces a stored policy with deny-all', async (t) => {
  const tmpDir = createTmpDir(t)
  await (await boot(tmpDir, { rbac: RBAC })).stop()
  const kernel = await boot(tmpDir, { rbac: null })
  t.alike(kernel.getRbac().policy, { enforcement: 'deny', roles: [], bindings: [] })
  t.absent(kernel.rbac.current().allows(SENTINEL, READ_A))
  await kernel.stop()
})

test('kernel-rbac - a stored policy that no longer validates is replaced by the one given at boot', async (t) => {
  const tmpDir = createTmpDir(t)
  const first = await boot(tmpDir, { rbac: RBAC })
  // As if an upgrade tightened validation: the record in force is now invalid.
  await first.rbac.bee.put('current', Buffer.from(JSON.stringify({ version: 'old', policy: { enforcement: 'allow' } })))
  await first.stop()

  const replaced = await boot(tmpDir, { rbac: RBAC })
  t.is(replaced.getRbac().source, 'boot')
  t.ok(replaced.rbac.current().allows(SENTINEL, READ_A), 'the given policy is in force')
  await replaced.stop()

  // With no policy given there is nothing to replace it with: refuse to start.
  const bare = new KernelManager({ kernel: { hrpc: false } }, { storeDir: path.join(tmpDir, 'store'), root: tmpDir, loadConf: () => {} })
  await bare.init()
  await bare.rbac.bee.put('current', Buffer.from(JSON.stringify({ version: 'old', policy: { enforcement: 'allow' } })))
  await t.exception(bare.start(), /ERR_RBAC_POLICY_INVALID/)
  await bare.stop().catch(() => {})
})

test('kernel-rbac - an invalid policy refuses the boot', async (t) => {
  const kernel = new KernelManager({ kernel: { hrpc: false } }, { storeDir: path.join(createTmpDir(t), 'store'), loadConf: () => {}, rbac: { enforcement: 'allow' } })
  await t.exception(kernel.init(), /ERR_RBAC_POLICY_INVALID/)
  t.absent(kernel._initialized)
})

test('kernel-rbac - applyRbac switches the policy; an invalid one keeps the policy in force', async (t) => {
  const kernel = await boot(createTmpDir(t), { rbac: RBAC })
  const before = kernel.getRbac().version

  await t.exception(kernel.applyRbac({ roles: [{ name: 'x', rules: [] }] }), /ERR_RBAC_POLICY_INVALID/)
  t.is(kernel.getRbac().version, before)

  const { changed, record } = await kernel.applyRbac({ ...RBAC, bindings: RBAC.bindings.slice(0, 1) }, { source: 'apply' })
  t.ok(changed)
  t.is(record.previous, before)
  t.absent(kernel.rbac.current().allows(SENTINEL, READ_A))
  await kernel.stop()
})
