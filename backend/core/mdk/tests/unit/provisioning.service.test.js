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
    conf: opts.conf || {},
    lookup: opts.lookup || null
  })
  await svc.init()
  return { svc, db, logs }
}

const OPTS = { address: '10.1.1.1', port: 4028, password: 'admin' }

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
  await svc1.registerThing({ id: 'dev-1', opts: OPTS, info: { container: 'c1' } })

  const svc2 = new DeviceProvisioningService({ db: db.sub('things'), deviceType: 'miner-wm-m30sp' })
  await svc2.init()
  t.alike(svc2.listDeviceIds(), ['dev-1'])
  const [runtimeDevice] = svc2.buildRuntimeDevices()
  t.is(runtimeDevice.deviceId, 'dev-1')
  t.alike(runtimeDevice.config, { ...OPTS, type: 'miner-wm-m30sp' })
  t.is(runtimeDevice.info.container, 'c1', 'the thing info rides along as the runtime device info block')
  t.ok(runtimeDevice.info.createdAt, 'with the timestamps registerThing stamped on it')
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

test('getThingConf / getDeviceMeta / listDevices redact secrets', async (t) => {
  const pools = [{ url: 'stratum+tcp://p1', user: 'w1', password: 'pool-pw' }, { url: 'stratum+tcp://p2', pass: 'x' }]
  const { svc } = await createService(t, { conf: { pools } })
  await svc.registerThing({ id: 'dev-1', opts: { ...OPTS, apiKey: 'k', nested: { privateKey: 'pk', seed: 's' } } })

  t.alike(svc.getThingConf({ requestType: 'poolConfig' }), [
    { url: 'stratum+tcp://p1', user: 'w1', password: '[REDACTED]' },
    { url: 'stratum+tcp://p2', pass: '[REDACTED]' }
  ])
  t.is(pools[0].password, 'pool-pw', 'conf itself is not mutated')

  const conf = svc.getThingConf({ thingId: 'dev-1' })
  t.is(conf.opts.password, '[REDACTED]')
  t.is(conf.opts.apiKey, '[REDACTED]')
  t.is(conf.opts.nested.privateKey, '[REDACTED]')
  t.is(conf.opts.nested.seed, '[REDACTED]')
  t.is(conf.opts.address, OPTS.address)

  t.is(svc.getDeviceMeta('dev-1').opts.password, '[REDACTED]')
  t.is(svc.listDevices({})[0].opts.password, '[REDACTED]')
  t.is(svc.getDevice('dev-1').opts.password, 'admin', 'stored record keeps the secret')
  t.is(svc.buildRuntimeDevices()[0].config.password, 'admin', 'runtime config keeps the secret')
})

test('listDevices filters on the non-secret opts.address / opts.port (the UI IP search)', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: OPTS, info: { container: 'c1' } })

  const hit = svc.listDevices({ query: { $and: [{ 'opts.address': { $in: ['10.1.1.1'] } }] } })
  t.is(hit.length, 1)
  t.is(hit[0].opts.password, '[REDACTED]', 'still redacted')
  t.is(svc.listDevices({ query: { 'opts.port': 4028 } }).length, 1)
  t.is(svc.listDevices({ query: { 'opts.address': { $in: ['10.9.9.9'] } } }).length, 0)
})

test('listDevices rejects secret/opts paths and code-evaluating operators', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: OPTS, info: { container: 'c1' } })

  t.exception(() => svc.listDevices({ query: { 'opts.password': { $regex: '^a' } } }), /ERR_QUERY_PATH_FORBIDDEN/)
  t.exception(() => svc.listDevices({ query: { 'opts.apiKey': { $exists: true } } }), /ERR_QUERY_PATH_FORBIDDEN/)
  t.exception(() => svc.listDevices({ query: { 'opts.address.x': 'a' } }), /ERR_QUERY_PATH_FORBIDDEN/)
  t.exception(() => svc.listDevices({ query: { $or: [{ 'x.password': 'a' }] } }), /ERR_QUERY_PATH_FORBIDDEN/)
  t.exception(() => svc.listDevices({ query: { $where: 'true' } }), /ERR_QUERY_OPERATOR_FORBIDDEN/)
  t.exception(() => svc.listDevices({ query: { $expr: { $eq: [1, 1] } } }), /ERR_QUERY_OPERATOR_FORBIDDEN/)
  t.exception(() => svc.listDevices({ sort: { 'opts.password': 1 } }), /ERR_QUERY_PATH_FORBIDDEN/)
  t.exception(() => svc.listDevices({ offset: -1 }), /ERR_QUERY_OFFSET_INVALID/)
  t.exception(() => svc.listDevices({ limit: 1.5 }), /ERR_QUERY_LIMIT_INVALID/)

  t.is(svc.listDevices({ query: { 'info.container': 'c1' } }).length, 1)
  t.is(svc.listDevices({ query: { tags: { $in: ['t-miner'] } } }).length, 1)
  t.is(svc.listDevices({ query: { type: { $regex: '^miner-' } } }).length, 1)
})

test('registerThing/updateThing enforce the device address policy', async (t) => {
  const lookup = async (host) => {
    if (host === 'evil.example') return [{ address: '169.254.169.254', family: 4 }]
    if (host === 'miner1.site') return [{ address: '10.2.0.1', family: 4 }]
    throw new Error('ENOTFOUND')
  }
  const { svc } = await createService(t, { lookup })

  for (const address of ['127.0.0.1', '169.254.169.254', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fe80::1', 'localhost', 'metadata.google.internal', 'evil.example', 'nope.invalid', 'a b', 42]) {
    await t.exception(svc.registerThing({ opts: { address } }), /ERR_THING_ADDRESS_(FORBIDDEN|INVALID|UNRESOLVABLE)/, String(address))
  }
  await t.exception(svc.registerThing({ opts: { address: '10.0.0.5', port: 70000 } }), /ERR_THING_PORT_INVALID/)
  await t.exception(svc.registerThing({ opts: { address: '10.0.0.5', port: 1.5 } }), /ERR_THING_PORT_INVALID/)

  await svc.registerThing({ id: 'dev-1', opts: { address: '10.0.0.5', port: '4028', password: 'admin' } })
  t.is(svc.getDevice('dev-1').opts.port, 4028, 'numeric-string port normalised')
  await svc.registerThing({ id: 'dev-2', opts: { address: 'miner1.site' } })

  await t.exception(svc.updateThing({ id: 'dev-1', opts: { address: '169.254.169.254' } }), /ERR_THING_ADDRESS_FORBIDDEN/)
  t.is(svc.getDevice('dev-1').opts.address, '10.0.0.5', 'rejected update leaves the record untouched')

  // Seeds are trusted operator config.
  await svc.registerThing({ id: 'seed-1', opts: { address: '127.0.0.1', port: 1 } }, { trusted: true })
  t.is(svc.getDevice('seed-1').opts.address, '127.0.0.1')
})

test('address allowlist replaces the default policy', async (t) => {
  const { svc } = await createService(t, { conf: { allowedAddressCidrs: ['127.0.0.0/8', '10.10.0.0/16'] } })
  await svc.registerThing({ id: 'dev-1', opts: { address: '127.0.0.2' } })
  await svc.registerThing({ id: 'dev-2', opts: { address: '10.10.3.4' } })
  await t.exception(svc.registerThing({ opts: { address: '10.11.0.1' } }), /ERR_THING_ADDRESS_FORBIDDEN/)
})

test('updateThing drops stored credentials when the address changes', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: { address: '10.0.0.5', port: 4028, password: 'admin', apiKey: 'k' } })

  await svc.updateThing({ id: 'dev-1', opts: { port: 4029 } })
  t.is(svc.getDevice('dev-1').opts.password, 'admin', 'same address keeps credentials')

  await svc.updateThing({ id: 'dev-1', opts: { address: '10.0.0.5', password: '[REDACTED]' } })
  t.is(svc.getDevice('dev-1').opts.password, 'admin', 'echoed redaction placeholder never overwrites a secret')

  await svc.updateThing({ id: 'dev-1', opts: { address: '10.0.0.6' } })
  const moved = svc.getDevice('dev-1').opts
  t.is(moved.address, '10.0.0.6')
  t.is(moved.port, 4029)
  t.absent('password' in moved, 'password dropped on repoint')
  t.absent('apiKey' in moved, 'apiKey dropped on repoint')

  await svc.updateThing({ id: 'dev-1', opts: { address: '10.0.0.7', password: 'new' } })
  t.is(svc.getDevice('dev-1').opts.password, 'new', 'credentials supplied with the new address are kept')
})

test('registerThing/updateThing validate info.container and info.pos', async (t) => {
  const { svc } = await createService(t)

  for (const container of ['__proto__', 'constructor', 'prototype', 'a/b', '../x', 'c'.repeat(65), '', ' lead', 5, {}, ['c1']]) {
    if (container === '') continue // empty means "not set"
    await t.exception(
      svc.registerThing({ opts: OPTS, info: { container } }),
      /ERR_THING_INFO_CONTAINER_INVALID/,
      `container ${JSON.stringify(container)} refused`
    )
  }
  for (const pos of ['__proto__', 'p\n1', 'x'.repeat(65), 7]) {
    await t.exception(svc.registerThing({ opts: OPTS, info: { pos } }), /ERR_THING_INFO_POS_INVALID/, `pos ${JSON.stringify(pos)} refused`)
  }
  await t.exception(svc.registerThing({ opts: OPTS, info: 'c1' }), /ERR_THING_INFO_INVALID/)
  t.is(svc.listDeviceIds().length, 0, 'nothing stored')

  await svc.registerThing({ id: 'dev-1', opts: OPTS, info: { container: 'bitdeer-4a', pos: '1-2_a3' } })
  await svc.registerThing({ id: 'dev-2', opts: { ...OPTS, address: '10.1.1.2' }, info: { container: 'Rack 1', pos: 'A1:x.1#2' } })
  await svc.registerThing({ id: 'dev-3', opts: { ...OPTS, address: '10.1.1.3' }, info: { container: '', pos: null } })
  t.is(svc.listDeviceIds().length, 3)
  t.ok(svc.getDevice('dev-1').tags.includes('container-bitdeer-4a'))

  await t.exception(svc.updateThing({ id: 'dev-1', info: { container: '__proto__' } }), /ERR_THING_INFO_CONTAINER_INVALID/)
  await t.exception(svc.updateThing({ id: 'dev-1', info: { pos: 'a'.repeat(100) }, forceOverwrite: true }), /ERR_THING_INFO_POS_INVALID/)
  t.is(svc.getDevice('dev-1').info.container, 'bitdeer-4a', 'refused update left the record unchanged')

  await svc.updateThing({ id: 'dev-1', info: { container: 'c2', pos: '3' } })
  t.is(svc.getDevice('dev-1').info.container, 'c2')
  t.ok(svc.getDevice('dev-1').tags.includes('pos-3'))
})

test('registerThing refuses tags that are not short labels', async (t) => {
  const { svc } = await createService(t)
  const bad = [['__proto__'], ['constructor'], [42], [''], ['a/b'], ['x'.repeat(65)], Array.from({ length: 33 }, (_, i) => `tag-${i}`)]
  for (const tags of bad) {
    await t.exception(svc.registerThing({ id: 'dev-1', opts: OPTS, tags }), /ERR_THING_TAGS_INVALID/, `refuses ${JSON.stringify(tags).slice(0, 40)}`)
  }
  t.is(svc.listDevices({}).length, 0, 'nothing is stored')
})

test('updateThing refuses an invalid tag and keeps the stored record', async (t) => {
  const { svc } = await createService(t)
  await svc.registerThing({ id: 'dev-1', opts: OPTS, tags: ['rack-a'] })
  await t.exception(svc.updateThing({ id: 'dev-1', tags: ['__proto__'] }), /ERR_THING_TAGS_INVALID/)
  const [dev] = svc.listDevices({})
  t.ok(dev.tags.includes('rack-a'))
  t.absent(dev.tags.includes('__proto__'))
})
