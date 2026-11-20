'use strict'

const test = require('brittle')
const { WorkerRegistry } = require('../../lib/modules/worker-registry')

function createMockStore () {
  const data = new Map()
  const store = {
    puts: 0,
    async get (key) { const v = data.get(key); return v ? { value: v } : null },
    async put (key, value) { store.puts++; data.set(key, value) },
    async del (key) { data.delete(key) },
    createReadStream () {
      const entries = [...data.entries()].map(([key, value]) => ({ key, value }))
      return (async function * () { for (const e of entries) yield e })()
    }
  }
  return store
}

async function setup () {
  const store = createMockStore()
  const registry = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await registry.register({ workerId: 'w1', deviceIds: ['d1', 'd2'], rpcKey: 'aa', channel: 'ch' })
  store.puts = 0
  return { registry, store }
}

test('worker-registry - syncDeviceIds skips the store write when the device list is unchanged', async (t) => {
  const { registry, store } = await setup()

  await registry.syncDeviceIds('w1', ['d1', 'd2'], 'ch')
  await registry.syncDeviceIds('w1', ['d2', 'd1'], 'ch')

  t.is(store.puts, 0, 'same devices (any order) are not rewritten')
  t.is(registry.resolveWorkerForDevice('d1').workerId, 'w1')
  t.is(registry.resolveWorkerForDevice('d2').workerId, 'w1')
})

test('worker-registry - syncDeviceIds persists and reindexes a changed device list', async (t) => {
  const { registry, store } = await setup()

  await registry.syncDeviceIds('w1', ['d2', 'd3'], 'ch')

  t.is(store.puts, 1, 'changed list is persisted once')
  t.is(registry.resolveWorkerForDevice('d1'), null, 'removed device is unmapped')
  t.is(registry.resolveWorkerForDevice('d3').workerId, 'w1', 'added device is mapped')
  const persisted = JSON.parse((await store.get('w1')).value.toString())
  t.alike(persisted.deviceIds, ['d2', 'd3'])
})

test('worker-registry - syncDeviceIds ignores unknown workers', async (t) => {
  const { registry, store } = await setup()

  await registry.syncDeviceIds('nope', ['x'], 'ch')

  t.is(store.puts, 0)
  t.is(registry.resolveWorkerForDevice('x'), null)
})

test('worker-registry - a workerId stays bound to its first rpcKey', async (t) => {
  const { registry } = await setup()

  const hijack = await registry.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'evil', channel: 'ch2' })
  t.alike(hijack, { registered: false, error: 'ERR_WORKER_KEY_CONFLICT', workerId: 'w1' }, 'different key for a known workerId is rejected')
  t.is(registry.listWorkers()[0].rpcKey, 'aa')

  const same = await registry.register({ workerId: 'w1', deviceIds: ['d1', 'd2'], rpcKey: 'aa', channel: 'ch' })
  t.alike(same, { registered: true }, 'the bound key may re-register')

  await registry.terminate('w1')
  const rebound = await registry.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'bb', channel: 'ch3' })
  t.alike(rebound, { registered: true }, 'after an admin terminate the id can bind to a new key')
})

test('worker-registry - binding survives recover()', async (t) => {
  const { registry, store } = await setup()
  const recovered = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await recovered.recover()
  t.is((await recovered.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'evil', channel: 'x' })).error, 'ERR_WORKER_KEY_CONFLICT')
  t.ok(registry)
})

test('worker-registry - a deviceId stays bound to its first worker, across recover(), until terminate', async (t) => {
  const { registry, store } = await setup()

  const renamed = await registry.register({ workerId: 'w1-renamed', deviceIds: ['d3', 'd2'], rpcKey: 'dd', channel: 'ch4' })
  t.alike(renamed, { registered: false, error: 'ERR_WORKER_DEVICE_CONFLICT', workerId: 'w1-renamed', deviceId: 'd2', ownerId: 'w1' })
  t.is(registry.resolveWorkerForDevice('d3'), null, 'the whole worker is refused, not only the claimed device')

  const recovered = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await recovered.recover()
  t.is((await recovered.register({ workerId: 'w1-renamed', deviceIds: ['d2'], rpcKey: 'dd', channel: 'ch4' })).ownerId, 'w1')

  await recovered.terminate('w1')
  t.alike(await recovered.register({ workerId: 'w1-renamed', deviceIds: ['d2'], rpcKey: 'dd', channel: 'ch4' }), { registered: true })
  t.is(recovered.resolveWorkerForDevice('d2').workerId, 'w1-renamed')
})

test('worker-registry - a device a worker drops across recover() is released when it registers again', async (t) => {
  const { store } = await setup()
  const recovered = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await recovered.recover()

  t.alike(await recovered.register({ workerId: 'w1', deviceIds: ['d1'], rpcKey: 'aa', channel: 'ch' }), { registered: true })
  t.is(recovered.resolveWorkerForDevice('d2'), null, 'the dropped device is unmapped')
  t.is(recovered.resolveWorkerForDevice('d1').workerId, 'w1')

  t.alike(await recovered.register({ workerId: 'w2', deviceIds: ['d2'], rpcKey: 'bb', channel: 'ch2' }), { registered: true }, 'another worker can claim it in the same run')
  t.is(recovered.resolveWorkerForDevice('d2').workerId, 'w2')
})

test('worker-registry - a renamed device stops resolving once its worker registers again', async (t) => {
  const { registry } = await setup()
  await registry.register({ workerId: 'w1', deviceIds: ['d1', 'd2-new'], rpcKey: 'aa', channel: 'ch' })
  t.is(registry.resolveWorkerForDevice('d2'), null)
  t.is(registry.resolveWorkerForDevice('d2-new').workerId, 'w1')
})

test('worker-registry - a refused registration leaves the existing mappings alone', async (t) => {
  const { registry } = await setup()
  await registry.register({ workerId: 'w2', deviceIds: ['d9'], rpcKey: 'cc', channel: 'ch9' })

  t.is((await registry.register({ workerId: 'w1', deviceIds: ['d9'], rpcKey: 'aa', channel: 'ch' })).error, 'ERR_WORKER_DEVICE_CONFLICT')
  t.is((await registry.register({ workerId: 'w1', deviceIds: [], rpcKey: 'evil', channel: 'x' })).error, 'ERR_WORKER_KEY_CONFLICT')
  t.is(registry.resolveWorkerForDevice('d1').workerId, 'w1', 'w1 keeps d1')
  t.is(registry.resolveWorkerForDevice('d2').workerId, 'w1', 'w1 keeps d2')
  t.alike(registry.devicesOf('w1'), ['d1', 'd2'])
  t.is(registry.resolveWorkerForDevice('d9').workerId, 'w2')
})

test('worker-registry - a worker cannot unmap devices another worker owns', async (t) => {
  const { registry } = await setup()
  await registry.register({ workerId: 'w2', deviceIds: ['d9'], rpcKey: 'cc', channel: 'ch9' })

  // w1 claims d9 vanished from its own list (it never owned it)
  const w1 = registry._workerIndex.get('w1')
  w1.deviceIds = ['d1', 'd2', 'd9']
  await registry.syncDeviceIds('w1', ['d1'], 'ch')
  t.is(registry.resolveWorkerForDevice('d9').workerId, 'w2', 'sync leaves the other worker mapping')

  w1.deviceIds = ['d1', 'd9']
  await registry.terminate('w1')
  t.is(registry.resolveWorkerForDevice('d9').workerId, 'w2', 'terminate leaves the other worker mapping')
  t.is(registry.resolveWorkerForDevice('d1'), null)
})

test('worker-registry - listWorkers carries deviceFamily and brand once the worker is READY', async (t) => {
  const { registry } = await setup()
  t.alike(registry.listWorkers()[0], { workerId: 'w1', deviceIds: ['d1', 'd2'], state: 'IDENTITY_SAVED', healthState: 'UNKNOWN', rpcKey: 'aa', deviceFamily: null, brand: null })

  await registry.setReady('w1', { metadata: { deviceFamily: 'miner', brand: 'Whatsminer' }, capabilities: {} })
  const row = registry.listWorkers()[0]
  t.is(row.deviceFamily, 'miner')
  t.is(row.brand, 'Whatsminer', 'the brand as the contract declares it')

  await registry.setReady('w1', { capabilities: {} })
  t.alike([registry.listWorkers()[0].deviceFamily, registry.listWorkers()[0].brand], [null, null], 'a contract without metadata names nothing')
})

test('worker-registry - recover() restores deviceFamily and brand from the stored contract, not routability', async (t) => {
  const { registry, store } = await setup()
  const capabilityStore = createMockStore()
  const withCaps = new WorkerRegistry({ store, capabilityStore })
  await withCaps.register({ workerId: 'w2', deviceIds: ['d3'], rpcKey: 'bb', channel: 'ch2' })
  await withCaps.setReady('w2', { metadata: { deviceFamily: 'miner', brand: 'Whatsminer' }, capabilities: {} })

  const recovered = new WorkerRegistry({ store, capabilityStore })
  await recovered.recover()
  const rows = Object.fromEntries(recovered.listWorkers().map((w) => [w.workerId, w]))
  t.alike(rows.w2, { workerId: 'w2', deviceIds: ['d3'], state: 'DISCOVERED', healthState: 'UNKNOWN', rpcKey: 'bb', deviceFamily: 'miner', brand: 'Whatsminer' })
  t.alike(rows.w1, { workerId: 'w1', deviceIds: ['d1', 'd2'], state: 'DISCOVERED', healthState: 'UNKNOWN', rpcKey: 'aa', deviceFamily: null, brand: null }, 'a worker that never reached READY has no stored contract')

  t.alike(recovered.nameParts('w2'), { family: 'miner', brand: 'whatsminer', worker: 'w2' }, 'scoped RBAC rules match the recovered worker')
  t.is(recovered.nameParts('w1'), null)
  t.absent(recovered.isRoutable('w2'), 'DISCOVERED: not routable until it reconnects')
  t.is(recovered.resolveWorkerForDevice('d3').channel, null)
  t.is(recovered.getCapabilities('d3'), null, 'device capabilities still wait for the reconnect')
  t.is(recovered.getReadyWorkers().length, 0)
  t.ok(registry)
})

test('worker-registry - setReady records whether the worker collects its own telemetry', async (t) => {
  const { registry } = await setup()
  const contract = { metadata: { deviceFamily: 'miner', brand: 'x' }, capabilities: { telemetry: [] } }

  await registry.setReady('w1', { ...contract, telemetryPollIntervalMs: 60000 })
  t.is(registry.getReadyWorkers()[0].pollsTelemetry, true)

  await registry.setReady('w1', contract)
  t.is(registry.getReadyWorkers()[0].pollsTelemetry, false, 'a contract without the key is polled by the scheduler')
})
