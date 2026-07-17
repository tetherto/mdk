'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createWorkerInfra } = require('../../lib/worker-infra')

async function setupInfra (t, opts = {}) {
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-infra-'))
  const infra = await createWorkerInfra({
    storeDir,
    deviceType: 'miner-test',
    specTags: ['miner'],
    baseType: 'miner',
    seedDevices: [{ id: 'dev-1', opts: { address: '127.0.0.1', port: 9001 }, info: { container: 'c1' } }],
    ...opts
  })
  t.teardown(() => infra.stop())
  return infra
}

function bindFakeRuntime (infra) {
  const fakeDevice = {
    getRealtimeData: async () => ({ hashrate_ths: 100 }),
    getSnap: async () => ({ success: true, stats: { status: 'mining' } }),
    validateWriteAction: (action, ...args) => 1
  }
  infra.bindRuntime({
    getDeviceContext: (deviceId) => (deviceId === 'dev-1' ? { device: fakeDevice } : null)
  })
  return fakeDevice
}

test('createWorkerInfra requires storeDir and deviceType', async (t) => {
  await t.exception(createWorkerInfra({ deviceType: 'x' }), /ERR_STORE_DIR_REQUIRED/)
  await t.exception(createWorkerInfra({ storeDir: '/tmp/whatever' }), /ERR_DEVICE_TYPE_REQUIRED/)
})

test('createWorkerInfra seeds devices once and exposes services', async (t) => {
  const infra = await setupInfra(t)
  t.is(infra.seeded, 1)
  t.ok(infra.services.provisioning.getDevice('dev-1'))
  t.alike(infra.services.provisioning.listDeviceIds(), ['dev-1'])
})

test('deviceCall throws before bindRuntime, and routes to the bound runtime after', async (t) => {
  const infra = await setupInfra(t)
  await t.exception(() => infra.deviceCall('dev-1', (d) => d), /ERR_RUNTIME_NOT_BOUND/)

  bindFakeRuntime(infra)
  const rtd = await infra.deviceCall('dev-1', (d) => d.getRealtimeData())
  t.alike(rtd, { hashrate_ths: 100 })

  await t.exception(() => infra.deviceCall('missing', (d) => d), /ERR_DEVICE_UNAVAILABLE: missing/)
})

test('comments service round-trips through the provisioning collaborators', async (t) => {
  const infra = await setupInfra(t)

  await infra.services.comments.saveThingComment({ thingId: 'dev-1', comment: 'hi', user: 'op' })

  const dev = infra.services.provisioning.getDevice('dev-1')
  t.is(dev.comments.length, 1)
  t.is(dev.comments[0].comment, 'hi')
  t.is(dev.comments[0].user, 'op')
  t.ok(dev.comments[0].id)
})

test('actions service lists devices and validates writes through the bound runtime', async (t) => {
  const infra = await setupInfra(t)
  bindFakeRuntime(infra)

  infra.services.actions.whitelistActions([['reboot', 1]])
  const res = await infra.services.actions.getWriteCalls({ query: {}, action: 'reboot', params: [] })

  t.is(res.calls.length, 1)
  t.is(res.calls[0].id, 'dev-1')
})

test('stats.buildStats("stat-rtd") pulls realtime data through the bound runtime', async (t) => {
  const infra = await setupInfra(t)
  bindFakeRuntime(infra)

  await infra.services.stats.buildStats('stat-rtd')
  t.pass('saveRealTimeData completed without throwing')
})

test('snaps.collectSnaps collects a snap through the bound runtime and saves alerts', async (t) => {
  const infra = await setupInfra(t)
  bindFakeRuntime(infra)

  await infra.services.snaps.collectSnaps()

  const last = infra.services.snaps.getLast('dev-1')
  t.ok(last)
  t.alike(last.snap, { success: true, stats: { status: 'mining' } })
})

test('logHistory resolves device info through the provisioning collaborator', async (t) => {
  const infra = await setupInfra(t)

  const picked = infra.services.logHistory._pickDevice('dev-1')
  t.is(picked.id, 'dev-1')
  t.is(picked.type, 'miner-test')
})
