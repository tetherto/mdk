'use strict'

const test = require('brittle')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { compilePolicy, kernelRequest, deviceName } = require('@tetherto/mdk-rbac')

const { siteAccess, syncUsers, readUserPasswords, GATEWAY_ACCOUNT } = require('../../backend/access')
const accessController = require('../../backend/gateway-plugins/site/controllers/access')
const activityController = require('../../backend/gateway-plugins/site/controllers/activity')

const exampleDir = path.join(__dirname, '..', '..')
const PLUGIN_DIR = path.join(exampleDir, 'backend', 'gateway-plugins', 'site')
const configDir = path.join(exampleDir, 'config')

const WM = { workerId: 'whatsminer-m56s-telemetry-flow', id: 'wm-1', type: 'miner-wm-m56s' }
const AM = { workerId: 'antminer-s21-telemetry-flow', id: 'am-1', type: 'miner-am-s21' }
// Contract-only workers report no device type: the brand comes from the workerId.
const SM = { workerId: 'sealminer-a2-contract', id: 'sm-1', type: '' }
const wmName = deviceName({ family: 'miner', brand: 'whatsminer', worker: WM.workerId, device: WM.id })
const amName = deviceName({ family: 'miner', brand: 'antminer', worker: AM.workerId, device: AM.id })
const poolName = deviceName({ family: 'minerpool', brand: 'ocean', worker: 'ocean-pool-worker', device: 'ocean-1' })

const tmpRoot = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-access-'))
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))
  return root
}

// The committed example's `rbac` block: the demo users, roles and bindings.
const exampleRbac = () => JSON.parse(fs.readFileSync(path.join(configDir, 'site.deploy.json.example'), 'utf8')).rbac

// The site policy built from the committed example, as the Kernel boots it.
const examplePolicy = (t) => {
  const access = exampleRbac()
  const root = tmpRoot(t)
  const site = siteAccess(root, { pluginDirs: [PLUGIN_DIR], mcpPluginDirs: [], rbac: access })
  return { access, root, ...site, compiled: compilePolicy(site.policy) }
}

const userOf = (access, name) => {
  const u = access.users.find((x) => x.name === name)
  return { kind: 'user', sub: u.name, email: u.email, groups: u.groups || [] }
}

test('site policy - compiles and registers the gateway account', (t) => {
  const { serviceAccounts, compiled } = examplePolicy(t)
  t.ok(serviceAccounts.some((sa) => sa.name === GATEWAY_ACCOUNT))
  const gw = { kind: 'serviceaccount', sub: GATEWAY_ACCOUNT }
  t.ok(compiled.evaluate(gw, kernelRequest('rbac.get')).allowed, 'gateway reads the policy')
  t.absent(compiled.evaluate(gw, kernelRequest('command.request', wmName)).allowed, 'gateway writes no device')
})

// What each user type may do, at the Gateway (routes) and the Kernel (devices).
const MATRIX = {
  admin: { activity: true, command: true, pools: true, writeWm: true, writeAm: true, readPool: true, log: true },
  operator: { activity: false, command: true, pools: true, writeWm: true, writeAm: true, readPool: true, log: false },
  'tech-whatsminer': { activity: false, command: true, pools: false, writeWm: true, writeAm: false, readPool: true, log: false },
  'pool-manager': { activity: false, command: false, pools: true, writeWm: true, writeAm: true, readPool: true, log: false },
  auditor: { activity: true, command: false, pools: false, writeWm: false, writeAm: false, readPool: true, log: true },
  viewer: { activity: false, command: false, pools: false, writeWm: false, writeAm: false, readPool: true, log: false },
  'tenant-antminer': { activity: false, command: true, pools: false, writeWm: false, writeAm: true, readPool: false, log: false }
}

test('site config - the example ships every demo user', (t) => {
  t.alike(exampleRbac().users.map((u) => u.name).sort(), Object.keys(MATRIX).sort())
})

test('site policy - each user type gets exactly its permissions', (t) => {
  const { access, compiled } = examplePolicy(t)
  const allowed = (id, request) => compiled.evaluate(id, request).allowed
  for (const [name, want] of Object.entries(MATRIX)) {
    const id = userOf(access, name)
    t.ok(allowed(id, { resource: 'site/site/overview', verb: 'get' }), `${name}: overview`)
    t.is(allowed(id, { resource: 'site/site/activity', verb: 'get' }), want.activity, `${name}: activity route`)
    t.is(allowed(id, { resource: 'site/site/miners/{deviceId}/command', verb: 'create' }), want.command, `${name}: command route`)
    t.is(allowed(id, { resource: 'site/site/miners/{deviceId}/pools', verb: 'create' }), want.pools, `${name}: pools route`)
    t.is(allowed(id, kernelRequest('command.request', wmName)), want.writeWm, `${name}: write whatsminer`)
    t.is(allowed(id, kernelRequest('command.request', amName)), want.writeAm, `${name}: write antminer`)
    t.is(allowed(id, kernelRequest('telemetry.pull', poolName)), want.readPool, `${name}: read pool`)
    t.is(allowed(id, kernelRequest('command.log')), want.log, `${name}: command log`)
    t.ok(allowed(id, kernelRequest('worker.list')), `${name}: list workers`)
    t.absent(allowed(id, kernelRequest('rbac.apply')), `${name}: never changes the policy`)
  }
})

test('syncUsers - creates users once with generated passwords, prunes removed ones', async (t) => {
  const root = tmpRoot(t)
  const store = new Map()
  const identity = {
    getUser: async (name) => store.get(name) || null,
    upsertUser: async (u) => { store.set(u.name, { ...store.get(u.name), ...u }) },
    deleteUser: async (name) => store.delete(name)
  }
  const users = [{ name: 'a', groups: ['x'] }, { name: 'b', groups: [] }]
  const first = await syncUsers(root, identity, users)
  t.alike(first.created, ['a', 'b'])
  const passwords = readUserPasswords(root)
  t.ok(passwords.a.length >= 12, 'password meets the issuer minimum')
  t.is(fs.statSync(path.join(root, 'credentials', 'users.json')).mode & 0o777, 0o600)

  const second = await syncUsers(root, identity, [{ name: 'a', groups: ['y'] }])
  t.alike(second.created, [])
  t.alike(second.removed, ['b'])
  t.is(readUserPasswords(root).a, passwords.a, 'an existing user keeps their password')
  t.alike(store.get('a').groups, ['y'], 'groups follow the config')
  t.absent(store.has('b'))
})

test('syncUsers - a shared password applies to every user, and resets one set before', async (t) => {
  const root = tmpRoot(t)
  const store = new Map()
  const sets = []
  const identity = {
    getUser: async (name) => store.get(name) || null,
    upsertUser: async (u) => {
      if (u.password) sets.push(u.name)
      store.set(u.name, { ...store.get(u.name), ...u })
    },
    deleteUser: async (name) => store.delete(name)
  }
  await syncUsers(root, identity, [{ name: 'a' }, { name: 'b', password: 'b-own-password' }])
  t.alike(readUserPasswords(root), { a: readUserPasswords(root).a, b: 'b-own-password' })
  t.not(readUserPasswords(root).a, 'mdk-site-demo', 'without a shared password, generated')

  sets.length = 0
  await syncUsers(root, identity, [{ name: 'a' }, { name: 'b' }], { password: 'mdk-site-demo' })
  t.alike(readUserPasswords(root), { a: 'mdk-site-demo', b: 'mdk-site-demo' })
  t.alike(sets, ['a', 'b'], 'existing users take the configured password')
  t.is(store.get('a').password, 'mdk-site-demo')

  sets.length = 0
  await syncUsers(root, identity, [{ name: 'a' }, { name: 'b' }], { password: 'mdk-site-demo' })
  t.alike(sets, [], 'a restart leaves passwords (and sessions) alone')
})

test('syncUsers - a failure partway keeps the passwords of users already created', async (t) => {
  const root = tmpRoot(t)
  const store = new Map()
  const identity = {
    getUser: async (name) => store.get(name) || null,
    upsertUser: async (u) => {
      if (u.name === 'b') throw new Error('ERR_ISSUER_DOWN')
      store.set(u.name, { ...store.get(u.name), ...u })
    },
    deleteUser: async (name) => store.delete(name)
  }
  await t.exception(syncUsers(root, identity, [{ name: 'a' }, { name: 'b' }]), /ERR_ISSUER_DOWN/)
  t.ok(store.has('a'))
  t.is(readUserPasswords(root).a, store.get('a').password, 'a can still sign in')
})

test('site config - the example shares one demo password the issuer accepts', (t) => {
  const { password } = exampleRbac()
  t.is(password, 'mdk-site-demo')
  t.ok(password.length >= 12, 'the token issuer refuses passwords under 12 characters')
})

// A Kernel client over three miner workers that serves the policy in force.
const fakeClient = (policy) => ({
  getRbac: async () => ({ record: { version: 'v1', policy } }),
  listWorkers: async () => ({
    workers: [WM, AM, SM].map((m) => ({ workerId: m.workerId, deviceIds: [m.id], state: 'READY', healthState: 'HEALTHY' }))
  }),
  pullTelemetry: async (deviceId, query) => {
    const m = [WM, AM, SM].find((x) => x.id === deviceId)
    if (query.type === 'config') return { config: { contract: { deviceFamily: 'miner' } } }
    if (query.type === 'count') return { count: 1 }
    return { things: [{ id: m.id, type: m.type }] }
  }
})

test('access route - lists the routes and miners open to the user', async (t) => {
  const { access, policy } = examplePolicy(t)
  const client = fakeClient(policy)
  const as = (name) => accessController({ _info: userOf(access, name) }, { mdkClient: client })

  const tech = await as('tech-whatsminer')
  t.alike(tech.roles.sort(), ['site-viewer', 'whatsminer-tech'])
  t.is(tech.routes['site.miner-command'], true)
  t.is(tech.routes['site.miner-pools'], false)
  t.alike(tech.miners, { command: [WM.id], pools: [] })

  const tenant = await as('tenant-antminer')
  t.alike(tenant.miners, { command: [AM.id], pools: [] })

  const viewer = await as('viewer')
  t.alike(viewer.miners, { command: [], pools: [] })
  t.is(viewer.routes['site.activity'], false)

  const admin = await as('admin')
  t.is(admin.routes['site.activity'], true)
  t.alike(admin.miners.command.sort(), [AM.id, SM.id, WM.id].sort())

  const operator = await as('operator')
  t.alike(operator.miners.command.sort(), [AM.id, SM.id, WM.id].sort(), 'miner/* covers a SealMiner')
  t.alike(operator.miners.pools.sort(), [AM.id, SM.id, WM.id].sort())

  const poolManager = await as('pool-manager')
  t.alike(poolManager.miners.command, [])
  t.alike(poolManager.miners.pools.sort(), [AM.id, SM.id, WM.id].sort())
})

test('access route - refuses a caller with no identity', async (t) => {
  await t.exception(accessController({ _info: {} }, { mdkClient: fakeClient(null) }), /ERR_SIGN_IN_REQUIRED/)
})

test('activity route - joins each attempt with how it settled', async (t) => {
  const mdkClient = {
    getCommandLog: async () => ({
      entries: [
        { ts: 3, event: 'settled', commandId: 'c1', outcome: 'COMPLETED' },
        { ts: 2, event: 'attempt', commandId: null, caller: { key: 'viewer', roles: ['site-viewer'] }, via: { key: 'app:site' }, command: 'setPowerMode', deviceId: 'wm-1', params: { mode: 'low' }, outcome: 'REJECTED', error: 'ERR_KERNEL_ACTION_FORBIDDEN: viewer (via app:site) may not write devices' },
        { ts: 1, event: 'attempt', commandId: 'c1', caller: { key: 'operator', roles: ['power-control'] }, via: { key: 'app:site' }, command: 'setPowerMode', deviceId: 'wm-1', params: { mode: 'high' }, outcome: 'PENDING' }
      ]
    })
  }
  const { entries } = await activityController({ query: {} }, { mdkClient })
  t.is(entries.length, 2)
  t.is(entries[0].user, 'viewer')
  t.is(entries[0].outcome, 'REJECTED')
  t.is(entries[1].user, 'operator')
  t.is(entries[1].via, 'app:site')
  t.is(entries[1].outcome, 'COMPLETED')
})

test('activity route - keeps limit within 1..500', async (t) => {
  const asked = []
  const mdkClient = { getCommandLog: async ({ limit }) => { asked.push(limit); return { entries: [] } } }
  for (const limit of [undefined, '-5', '0', '2.7', '100000', 'abc']) {
    await activityController({ query: { limit } }, { mdkClient })
  }
  t.alike(asked, [100, 1, 100, 2, 500, 100])
})
