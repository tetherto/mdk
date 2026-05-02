'use strict'

const path = require('path')
const crypto = require('crypto')
const { test } = require('brittle')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const ModbusFacility = require('svc-facs-modbus')
const MicroBT = require('../../lib/microbt')
const MicroBTManager = require('../../lib/microbt.manager')
const libAlerts = require('../../lib/templates/alerts')
const libStats = require('../../lib/templates/stats')
const { CONTAINER_TYPES } = require('../../lib/utils/constants')

const MOCK_HOST = '127.0.0.1'
const MOCK_PORT = 48100
const MOCK_PORT_KEHUA = 48110

test('package exports MicroBT and MicroBTManager via container and microbt', (t) => {
  const Container = require('../../lib/container')
  t.ok(typeof Container === 'function', 'Container (container.js) is a constructor')
  t.ok(typeof MicroBT === 'function', 'MicroBT is a constructor')
  t.ok(typeof MicroBTManager === 'function', 'MicroBTManager is a constructor')
  t.ok(Container === MicroBT, 'container re-exports MicroBT')
})

test('MicroBT and MicroBTManager type alignment', (t) => {
  const ctx = { rack: 'test-rack' }
  const manager = new MicroBTManager({}, ctx)
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const container = new MicroBT({ getClient })
  t.is(manager.getThingType(), 'container-mbt', 'manager reports container-mbt type')
  t.is(container._type, 'container', 'container instance has type container')
})

test('MicroBT validateWriteAction works with manager getThingType', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const container = new MicroBT({ getClient })
  const result = container.validateWriteAction('switchContainer', true)
  t.is(result, 1, 'validateWriteAction returns 1')
})

test('constants and templates load', (t) => {
  t.is(CONTAINER_TYPES.WONDERINT, 'wonderint', 'CONTAINER_TYPES available')
  t.is(CONTAINER_TYPES.KEHUA, 'kehua', 'KEHUA type available')
  t.ok(libAlerts.specs.container !== undefined, 'alerts container spec available')
  t.ok(libStats.specs.container !== undefined, 'stats container spec available')
  t.ok(libStats.specs.container.ops.container_specific_stats_group !== undefined, 'stats container_specific_stats_group available')
})

test('MicroBTManager init with mocked facs completes', async (t) => {
  const emptyAsyncIterable = { [Symbol.asyncIterator]: async function * () {} }
  const pkgRoot = path.join(__dirname, '../..')
  const ctx = {
    rack: 'integration-rack',
    storeDir: null,
    root: pkgRoot,
    facs: {
      store_s1: {
        getBee: async () => ({
          ready: async () => {},
          sub: () => ({ createReadStream: () => emptyAsyncIterable })
        })
      },
      interval_0: { add: () => {} },
      scheduler_0: { add: () => {} },
      mdkThgWriteCalls_0: { whitelistActions: () => {} }
    }
  }
  const manager = new MicroBTManager({}, ctx)
  await manager.init()
  t.ok(manager._initialized, 'manager initialized')
  t.ok(manager.rackId && typeof manager.rackId === 'string', 'rackId set')
  t.ok(manager.modbus_0, 'modbus_0 facility created')
})

test('e2e: mock server + container init + getSnap captures data', async (t) => {
  const createServer = require('../../mock/server').createServer
  const password = crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)

  const mock = createServer({
    host: MOCK_HOST,
    port: MOCK_PORT,
    type: 'wonderint'
  })

  t.teardown(() => {
    if (mock && mock.server) mock.server.close()
    if (typeof mock.cleanup === 'function') mock.cleanup()
    if (container) container.close()
  })

  const fac = new ModbusFacility({ ctx: { env: 'test', root: path.join(__dirname, '../..') } }, {}, { env: 'test', root: path.join(__dirname, '../..') })
  const container = new MicroBT({
    timeout: 5000,
    getClient: fac.getClient.bind(fac),
    address: MOCK_HOST,
    port: MOCK_PORT,
    username: 'admin',
    password
  })

  await promiseSleep(400)
  await container.init()

  const snap = await container.getSnap()
  t.ok(snap, 'getSnap returns object')
  t.ok(snap.stats, 'snap has stats')
  t.ok(typeof snap.stats.status === 'string', 'stats.status is string')
  t.ok(['running', 'stopped', 'error'].includes(snap.stats.status), 'stats.status is valid')
  t.ok(typeof snap.stats.power_w === 'number', 'stats.power_w is number')
  t.ok(snap.stats.power_w >= 0, 'stats.power_w non-negative')
  t.ok(snap.stats.container_specific, 'stats.container_specific present')
  t.ok(Array.isArray(snap.stats.container_specific.power_meters), 'container_specific.power_meters is array')
  t.ok(Array.isArray(snap.stats.container_specific.pdu_data), 'container_specific.pdu_data is array')
  t.ok(snap.stats.container_specific.env && typeof snap.stats.container_specific.env === 'object', 'container_specific.env present')
  t.ok(snap.stats.container_specific.cdu && typeof snap.stats.container_specific.cdu === 'object', 'container_specific.cdu present')
  t.ok(snap.config && snap.config.container_specific && snap.config.container_specific.diag, 'config.container_specific.diag present')
})

test('e2e: repeated getSnap reads succeed', async (t) => {
  const createServer = require('../../mock/server').createServer
  const password = crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)

  const mock = createServer({
    host: MOCK_HOST,
    port: MOCK_PORT + 1,
    type: 'wonderint'
  })

  t.teardown(() => {
    if (mock && mock.server) mock.server.close()
    if (typeof mock.cleanup === 'function') mock.cleanup()
    if (container) container.close()
  })

  const fac = new ModbusFacility({ ctx: { env: 'test', root: path.join(__dirname, '../..') } }, {}, { env: 'test', root: path.join(__dirname, '../..') })
  const container = new MicroBT({
    timeout: 5000,
    getClient: fac.getClient.bind(fac),
    address: MOCK_HOST,
    port: MOCK_PORT + 1,
    username: 'admin',
    password
  })

  await promiseSleep(400)
  await container.init()

  const snap1 = await container.getSnap()
  const snap2 = await container.getSnap()
  t.ok(snap1 && snap2, 'both getSnap calls return')
  t.ok(snap1.stats && snap2.stats, 'both have stats')
  t.is(snap1.stats.status, snap2.stats.status, 'status consistent across reads')
  t.ok(Array.isArray(snap1.stats.container_specific.power_meters) && snap1.stats.container_specific.power_meters.length > 0, 'power_meters captured')
})

test('e2e: switchContainer write then getSnap', async (t) => {
  const createServer = require('../../mock/server').createServer
  const password = crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)

  const mock = createServer({
    host: MOCK_HOST,
    port: MOCK_PORT + 2,
    type: 'wonderint'
  })

  t.teardown(() => {
    if (mock && mock.server) mock.server.close()
    if (typeof mock.cleanup === 'function') mock.cleanup()
    if (container) container.close()
  })

  const fac = new ModbusFacility({ ctx: { env: 'test', root: path.join(__dirname, '../..') } }, {}, { env: 'test', root: path.join(__dirname, '../..') })
  const container = new MicroBT({
    timeout: 5000,
    getClient: fac.getClient.bind(fac),
    address: MOCK_HOST,
    port: MOCK_PORT + 2,
    username: 'admin',
    password
  })

  await promiseSleep(400)
  await container.init()

  const result = await container.switchContainer(false)
  t.ok(result && result.success === true, 'switchContainer(false) succeeds')
  const snap = await container.getSnap()
  t.ok(snap && snap.stats, 'getSnap after switchContainer returns stats')
})

test('e2e (kehua): mock server + container init + getSnap captures data', async (t) => {
  const createServer = require('../../mock/server').createServer
  const password = crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)

  const mock = createServer({
    host: MOCK_HOST,
    port: MOCK_PORT_KEHUA,
    type: 'kehua'
  })

  t.teardown(() => {
    if (mock && mock.server) mock.server.close()
    if (typeof mock.cleanup === 'function') mock.cleanup()
    if (container) container.close()
  })

  const fac = new ModbusFacility({ ctx: { env: 'test', root: path.join(__dirname, '../..') } }, {}, { env: 'test', root: path.join(__dirname, '../..') })
  const container = new MicroBT({
    timeout: 5000,
    getClient: fac.getClient.bind(fac),
    address: MOCK_HOST,
    port: MOCK_PORT_KEHUA,
    username: 'admin',
    password,
    type: CONTAINER_TYPES.KEHUA
  })

  await promiseSleep(400)
  await container.init()

  const snap = await container.getSnap()
  t.ok(snap, 'getSnap returns object')
  t.ok(snap.stats, 'snap has stats')
  t.ok(typeof snap.stats.status === 'string', 'stats.status is string')
  t.ok(['running', 'stopped', 'error'].includes(snap.stats.status), 'stats.status is valid')
  t.ok(snap.stats.container_specific && snap.stats.container_specific.cdu, 'container_specific.cdu present')
  t.ok(snap.stats.container_specific.cdu.cooling_system_status !== undefined, 'kehua: cooling_system_status present')
  t.ok(snap.stats.container_specific.cdu.unit_outlet_temp_t3 === undefined, 'kehua: unit_outlet_temp_t3 undefined')
})

test('e2e (kehua): repeated getSnap reads succeed', async (t) => {
  const createServer = require('../../mock/server').createServer
  const password = crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)

  const mock = createServer({
    host: MOCK_HOST,
    port: MOCK_PORT_KEHUA + 1,
    type: 'kehua'
  })

  t.teardown(() => {
    if (mock && mock.server) mock.server.close()
    if (typeof mock.cleanup === 'function') mock.cleanup()
    if (container) container.close()
  })

  const fac = new ModbusFacility({ ctx: { env: 'test', root: path.join(__dirname, '../..') } }, {}, { env: 'test', root: path.join(__dirname, '../..') })
  const container = new MicroBT({
    timeout: 5000,
    getClient: fac.getClient.bind(fac),
    address: MOCK_HOST,
    port: MOCK_PORT_KEHUA + 1,
    username: 'admin',
    password,
    type: CONTAINER_TYPES.KEHUA
  })

  await promiseSleep(400)
  await container.init()

  const snap1 = await container.getSnap()
  const snap2 = await container.getSnap()
  t.ok(snap1 && snap2, 'both getSnap calls return')
  t.ok(snap1.stats && snap2.stats, 'both have stats')
  t.is(snap1.stats.status, snap2.stats.status, 'status consistent across reads')
  t.ok(Array.isArray(snap1.stats.container_specific.pdu_data), 'pdu_data captured')
})

test('e2e (kehua): switchContainer write then getSnap', async (t) => {
  const createServer = require('../../mock/server').createServer
  const password = crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)

  const mock = createServer({
    host: MOCK_HOST,
    port: MOCK_PORT_KEHUA + 2,
    type: 'kehua'
  })

  t.teardown(() => {
    if (mock && mock.server) mock.server.close()
    if (typeof mock.cleanup === 'function') mock.cleanup()
    if (container) container.close()
  })

  const fac = new ModbusFacility({ ctx: { env: 'test', root: path.join(__dirname, '../..') } }, {}, { env: 'test', root: path.join(__dirname, '../..') })
  const container = new MicroBT({
    timeout: 5000,
    getClient: fac.getClient.bind(fac),
    address: MOCK_HOST,
    port: MOCK_PORT_KEHUA + 2,
    username: 'admin',
    password,
    type: CONTAINER_TYPES.KEHUA
  })

  await promiseSleep(400)
  await container.init()

  const result = await container.switchContainer(true)
  t.ok(result && result.success === true, 'switchContainer(true) succeeds')
  const snap = await container.getSnap()
  t.ok(snap && snap.stats, 'getSnap after switchContainer returns stats')
})
