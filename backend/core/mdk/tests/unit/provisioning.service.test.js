'use strict'

const test = require('brittle')
const DeviceProvisioningService = require('../../lib/services/provisioning.service')
const LogsService = require('../../lib/services/logs.service')
const { createTestStore, createTestBee } = require('../helpers/store')

async function createService (t, opts = {}) {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  const logs = opts.withLogs
    ? new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf: {} })
    : null
  const svc = new DeviceProvisioningService({
    db: db.sub('things'),
    logs,
    deviceType: 'miner-wm-m30sp',
    deviceTags: ['whatsminer'],
    conf: opts.conf || {}
  })
  await svc.init()
  return { svc, db, logs }
}

const OPTS = { address: '127.0.0.1', port: 4028, password: 'admin' }

test('constructor requires db and deviceType', (t) => {
  t.exception(() => new DeviceProvisioningService({ deviceType: 'x' }), /ERR_PROVISIONING_DB_REQUIRED/)
  t.exception(() => new DeviceProvisioningService({ db: {} }), /ERR_PROVISIONING_DEVICE_TYPE_REQUIRED/)
})

test('registerThing persists a typed record with code and tags', async (t) => {
  const { svc } = await createService(t)

  await svc.registerThing({ id: 'dev-1', opts: OPTS, info: { container: 'c1', serialNum: 'SN1' } })

  const dev = svc.getDevice('dev-1')
  t.is(dev.type, 'miner-wm-m30sp')
  t.is(dev.code, 'WM-M30SP-0001')
  t.ok(dev.tags.includes('t-miner-wm'))
  t.ok(dev.tags.includes('t-miner'))
  t.ok(dev.tags.includes('whatsminer'))
  t.ok(dev.tags.includes('id-dev-1'))
  t.ok(dev.tags.includes('container-c1'))
  t.ok(dev.info.createdAt)
})

test('registerThing validations', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: OPTS, info: { serialNum: 'SN1', macAddress: 'AA:BB', container: 'c1', pos: '1' } })

  await t.exception(svc.registerThing({ id: 'dev-1', opts: { address: '10.0.0.9' } }), /ERR_THING_WITH_ID_ALREADY_EXISTS/)
  await t.exception(svc.registerThing({ opts: { address: '10.0.0.9' }, code: 'nope' }), /ERR_THING_CODE_INVALID/)
  await t.exception(svc.registerThing({ id: 'dev-2' }), /ERR_THING_VALIDATE_OPTS_INVALID/)
  await t.exception(
    svc.registerThing({ id: 'dev-2', opts: { address: '10.0.0.9' }, info: { serialNum: 'SN1' } }),
    /ERR_THING_SERIALNUM_EXISTS/
  )
  await t.exception(
    svc.registerThing({ id: 'dev-2', opts: { address: '10.0.0.9' }, info: { macAddress: 'aa:bb' } }),
    /ERR_THING_MACADDRESS_EXISTS/
  )
  await t.exception(
    svc.registerThing({ id: 'dev-2', opts: { address: '10.0.0.9' }, info: { container: 'c1', pos: '1' } }),
    /ERR_THING_POS_EXISTS/
  )
  await t.exception(
    svc.registerThing({ id: 'dev-2', opts: OPTS }),
    /ERR_THING_IP_ADDRESS_EXISTS/
  )
})

test('updateThing merges opts/info, rebuilds tags and logs info history', async (t) => {
  const { svc, logs } = await createService(t, { withLogs: true })
  await svc.registerThing({ id: 'dev-1', opts: OPTS, info: { container: 'c1', pos: '1' } })

  await svc.updateThing({ id: 'dev-1', info: { pos: '2' }, opts: { port: 4029 } })

  const dev = svc.getDevice('dev-1')
  t.is(dev.info.pos, '2')
  t.is(dev.opts.port, 4029)
  t.is(dev.opts.address, OPTS.address, 'merge keeps prior opts')
  t.ok(dev.tags.includes('pos-2'))
  t.absent(dev.tags.includes('pos-1'))

  const log = await logs.getBeeTimeLog('thing-history-log', 0)
  t.ok(log, 'info history written')
  const entries = []
  for await (const chunk of log.createReadStream({})) {
    entries.push(...JSON.parse(chunk.value.toString()))
  }
  await logs.releaseBeeTimeLog(log)
  t.is(entries.length, 1)
  t.is(entries[0].id, 'dev-1')
  t.alike(entries[0].changes.pos, { oldValue: '1', newValue: '2' })
})

test('updateThing rejects unknown device', async (t) => {
  const { svc } = await createService(t)
  await t.exception(svc.updateThing({ id: 'nope', info: {} }), /ERR_THING_NOTFOUND/)
})

test('forgetThings removes by query and by all', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: { address: '10.0.0.1' } })
  await svc.registerThing({ id: 'dev-2', opts: { address: '10.0.0.2' } })

  t.is(await svc.forgetThings({ query: { id: 'dev-1' } }), 1)
  t.is(svc.getDevice('dev-1'), undefined)

  t.is(await svc.forgetThings({ all: true }), 1)
  t.alike(svc.listDeviceIds(), [])
})

test('records survive a restart (fresh service over the same store)', async (t) => {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')

  const svc1 = new DeviceProvisioningService({ db: db.sub('things'), deviceType: 'miner-wm-m30sp' })
  await svc1.init()
  await svc1.registerThing({ id: 'dev-1', opts: OPTS })

  const svc2 = new DeviceProvisioningService({ db: db.sub('things'), deviceType: 'miner-wm-m30sp' })
  await svc2.init()
  t.alike(svc2.listDeviceIds(), ['dev-1'])
  t.alike(svc2.buildRuntimeDevices(), [{
    deviceId: 'dev-1',
    config: { ...OPTS, type: 'miner-wm-m30sp' }
  }])
})

test('comment collaborators: loadThing/saveThing/checkThingExists', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: OPTS })

  t.exception(() => svc.checkThingExists({ thingId: 'nope' }), /ERR_THING_NOTFOUND/)

  const rec = await svc.loadThing({ thingId: 'dev-1' })
  rec.comments = [{ id: 'c1', comment: 'hi', user: 'op', ts: 1 }]
  await svc.saveThing(rec)

  t.is(svc.getDevice('dev-1').comments.length, 1)
  const reread = await svc.loadThing({ thingId: 'dev-1' })
  t.is(reread.comments[0].comment, 'hi')
})

test('getThingConf serves pool config and device records', async (t) => {
  const { svc } = await createService(t, { conf: { pools: [{ url: 'stratum+tcp://p1' }] } })
  await svc.registerThing({ id: 'dev-1', opts: OPTS })

  t.alike(svc.getThingConf({ requestType: 'poolConfig' }), [{ url: 'stratum+tcp://p1' }])
  const conf = svc.getThingConf({ thingId: 'dev-1' })
  t.is(conf.id, 'dev-1')
  t.is(conf.opts.address, OPTS.address)
  t.is(svc.getThingConf({ thingId: 'nope' }), null)
})
