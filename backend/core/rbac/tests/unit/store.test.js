'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const { PolicyStore } = require('../../index')
const stackRbac = require('../fixtures/stack-rbac')

const admin = { kind: 'user', sub: 'u-1', email: 'ankit@example.com' }
const route = { resource: 'ops-center/miners', verb: 'list' }

async function openBee (t, dir) {
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-rbac-store-'))
  const store = new Corestore(dir)
  const bee = new Hyperbee(store.get({ name: 'kernel-db' }), { keyEncoding: 'utf-8' })
  await bee.ready()
  const close = async () => { await bee.close(); await store.close() }
  return { dir, bee: bee.sub('kernel-rbac'), close }
}

function cleanup (t, dir) {
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
}

test('denies everything until a policy is loaded or applied', async (t) => {
  const { dir, bee, close } = await openBee(t)
  cleanup(t, dir)
  const store = new PolicyStore({ bee })
  t.is(await store.load(), null)
  t.absent(store.current().allows(admin, route))
  t.is(store.info(), null)
  await close()
})

test('apply persists, switches and survives a restart', async (t) => {
  const first = await openBee(t)
  cleanup(t, first.dir)
  const store = new PolicyStore({ bee: first.bee, now: () => Date.UTC(2026, 9, 21) })
  const changes = []
  store.on('change', (compiled, record) => changes.push(record.version))

  const { changed, record } = await store.apply(stackRbac(), { source: 'boot' })
  t.ok(changed)
  t.is(record.source, 'boot')
  t.is(record.previous, null)
  t.is(record.appliedAt, '2026-10-21T00:00:00.000Z')
  t.ok(store.current().allows(admin, route))
  t.alike(changes, [record.version])
  await first.close()

  const again = await openBee(t, first.dir)
  const reloaded = new PolicyStore({ bee: again.bee })
  const loaded = await reloaded.load()
  t.is(loaded.version, record.version)
  t.ok(reloaded.current().allows(admin, route))
  await again.close()
})

test('applying the policy in force is a no-op; a change records its predecessor', async (t) => {
  const { dir, bee, close } = await openBee(t)
  cleanup(t, dir)
  let clock = 0
  const store = new PolicyStore({ bee, now: () => ++clock * 1000 })
  const a = await store.apply(stackRbac())
  t.absent((await store.apply(stackRbac())).changed)

  const narrowed = stackRbac()
  narrowed.bindings = narrowed.bindings.filter((b) => b.role !== 'admin')
  const b = await store.apply(narrowed, { source: 'cli', by: 'abcd' })
  t.ok(b.changed)
  t.is(b.record.previous, a.record.version)
  t.is(b.record.by, 'abcd')
  t.absent(store.current().allows(admin, route))

  const history = await store.history()
  t.alike(history.map((r) => r.version), [a.record.version, b.record.version])
  t.alike((await store.history({ limit: 1 })).map((r) => r.version), [b.record.version])
  await close()
})

test('an invalid policy is refused and the policy in force is untouched', async (t) => {
  const { dir, bee, close } = await openBee(t)
  cleanup(t, dir)
  const store = new PolicyStore({ bee })
  const { record } = await store.apply(stackRbac())
  await t.exception(store.apply({ enforcement: 'allow' }), /ERR_RBAC_POLICY_INVALID/)
  t.is(store.info().version, record.version)
  t.ok(store.current().allows(admin, route))
  t.is((await store.history()).length, 1)
  await close()
})

test('absent policy applies as deny-all', async (t) => {
  const { dir, bee, close } = await openBee(t)
  cleanup(t, dir)
  const store = new PolicyStore({ bee })
  await store.apply(stackRbac())
  const { changed, record } = await store.apply(null)
  t.ok(changed)
  t.alike(record.policy, { enforcement: 'deny', roles: [], bindings: [] })
  t.absent(store.current().allows(admin, route))
  await close()
})

test('requires a bee', (t) => {
  t.exception(() => new PolicyStore(), /ERR_RBAC_STORE_BEE_REQUIRED/)
})
