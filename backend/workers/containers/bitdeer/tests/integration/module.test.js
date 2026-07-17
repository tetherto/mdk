'use strict'

const net = require('net')
const { test } = require('brittle')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const { Aedes } = require('aedes')
const Bitdeer = require('../../lib/bitdeer')
const libAlerts = require('../../lib/templates/alerts')
const libStats = require('../../lib/templates/stats')
const { MAPPINGS, ERROR_MAP, DEVICE_TYPE_MAP, DEFAULT_MQTT_PORT } = require('../../lib/utils/constants')
const mockServer = require('../../mock/server')

const E2E_HOST = '127.0.0.1'
const E2E_BROKER_PORT = 18700
const E2E_CONTAINER_ID = 'E2E_D40'
const E2E_MOCK_WAIT_MS = 2500

const E2E_TYPES = [
  { mockType: 'D40_M56', model: 'm56' },
  { mockType: 'D40_M30', model: 'm30' },
  { mockType: 'D40_A1346', model: 'a1346' },
  { mockType: 'D40_S19xp', model: 's19xp' }
]

test('package exports plugin, boot and Bitdeer', (t) => {
  const pkg = require('../../index.js')
  t.ok(pkg.plugin && pkg.plugin.contract, 'plugin with contract')
  t.is(typeof pkg.startBitdeerWorker, 'function', 'startBitdeerWorker is function')
  t.is(pkg.Bitdeer, Bitdeer, 'Bitdeer exported')
})

test('Bitdeer device type alignment', (t) => {
  const server = { subscribe: () => {}, publish: () => {} }
  const container = new Bitdeer({ server, containerId: 'C1', type: 'm56' })
  t.is(container._type, 'container', 'container instance has type container')
})

test('constants and templates load', (t) => {
  t.ok(MAPPINGS.m56, 'MAPPINGS.m56 available')
  t.ok(MAPPINGS.m30, 'MAPPINGS.m30 available')
  t.ok(ERROR_MAP['OilPump1 error'], 'ERROR_MAP available')
  t.is(DEVICE_TYPE_MAP.D40_M56, 'm56', 'DEVICE_TYPE_MAP available')
  t.is(DEFAULT_MQTT_PORT, 10883, 'DEFAULT_MQTT_PORT available')
  t.ok(libAlerts.specs.container !== undefined, 'alerts container spec available')
  t.ok(libStats.specs.container !== undefined, 'stats container spec available')
  t.ok(libStats.specs.container.ops.container_specific_stats_group !== undefined, 'stats container_specific_stats_group available')
})

for (let i = 0; i < E2E_TYPES.length; i++) {
  const { mockType, model } = E2E_TYPES[i]
  const port = E2E_BROKER_PORT + i
  const containerId = `${E2E_CONTAINER_ID}_${model}`

  test(`e2e: mock/server + broker + getSnap returns snap with stats and config (${model})`, async (t) => {
    const aedes = await Aedes.createBroker()
    const server = net.createServer(aedes.handle)
    await new Promise((resolve, reject) => {
      server.listen(port, E2E_HOST, () => resolve())
      server.on('error', reject)
    })

    const mockClient = mockServer.createServer({
      host: E2E_HOST,
      port,
      type: mockType,
      id: containerId
    })

    const container = new Bitdeer({
      server: aedes,
      containerId,
      type: model,
      conf: { delay: 0 }
    })

    t.teardown(() => {
      if (mockClient && typeof mockClient.exit === 'function') mockClient.exit()
      server.close()
      aedes.close()
    })

    await promiseSleep(E2E_MOCK_WAIT_MS)

    const snap = await container.getSnap()
    t.ok(snap, 'getSnap returns object')
    t.ok(snap.stats, 'snap has stats')
    t.is(typeof snap.stats.status, 'string', 'stats.status is string')
    t.ok(['running', 'stopped', 'error'].includes(snap.stats.status), 'stats.status is valid')
    t.is(typeof snap.stats.power_w, 'number', 'stats.power_w is number')
    t.ok(snap.stats.power_w >= 0, 'stats.power_w non-negative')
    t.ok(snap.stats.container_specific, 'stats.container_specific present')
    t.ok(Array.isArray(snap.stats.container_specific.pdu_data), 'container_specific.pdu_data is array')
    t.ok(snap.stats.container_specific.cooling_system !== undefined, 'container_specific.cooling_system present')
    t.ok(snap.stats.container_specific.ups !== undefined, 'container_specific.ups present')
    t.ok(snap.config && snap.config.container_specific, 'config.container_specific present')
    t.ok(snap.config.container_specific.tactics !== undefined, 'config.container_specific.tactics present')
    t.ok(snap.config.container_specific.alarms !== undefined, 'config.container_specific.alarms present')
  })
}

test('e2e: mock/server + repeated getSnap reads succeed', async (t) => {
  const port = E2E_BROKER_PORT + E2E_TYPES.length
  const containerId2 = E2E_CONTAINER_ID + '_repeat'
  const { mockType, model } = E2E_TYPES[0]
  const aedes = await Aedes.createBroker()
  const server = net.createServer(aedes.handle)
  await new Promise((resolve, reject) => {
    server.listen(port, E2E_HOST, () => resolve())
    server.on('error', reject)
  })

  const mockClient = mockServer.createServer({
    host: E2E_HOST,
    port,
    type: mockType,
    id: containerId2
  })

  const container = new Bitdeer({
    server: aedes,
    containerId: containerId2,
    type: model,
    conf: { delay: 0 }
  })

  t.teardown(() => {
    if (mockClient && typeof mockClient.exit === 'function') mockClient.exit()
    server.close()
    aedes.close()
  })

  await promiseSleep(E2E_MOCK_WAIT_MS)

  const snap1 = await container.getSnap()
  const snap2 = await container.getSnap()
  t.ok(snap1 && snap2, 'both getSnap calls return')
  t.ok(snap1.stats && snap2.stats, 'both have stats')
  t.is(snap1.stats.status, snap2.stats.status, 'status consistent across reads')
  t.is(snap1.stats.power_w, snap2.stats.power_w, 'power_w consistent')
})
