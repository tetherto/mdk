'use strict'

const net = require('net')
const path = require('path')
const test = require('brittle')
const Antminer = require('../../lib/antminer.js')
const AntminerManagerS21 = require('../../lib/types/s21.miner.manager.js')
const { createServer } = require(path.join(__dirname, '../../mock/server.js'))

const MOCK_PORT = 8000

function waitForPort (host, port, options = {}) {
  const timeout = options.timeout ?? 5000
  const interval = options.interval ?? 100
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function tryConnect () {
      const socket = new net.Socket()
      const onError = () => {
        socket.destroy()
        if (Date.now() - start >= timeout) {
          reject(new Error(`Timeout waiting for ${host}:${port}`))
        } else {
          setTimeout(tryConnect, interval)
        }
      }
      socket.setTimeout(500)
      socket.once('error', onError)
      socket.once('timeout', onError)
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.connect(port, host)
    }
    tryConnect()
  })
}
const MOCK_OPTS = {
  host: '127.0.0.1',
  port: MOCK_PORT,
  type: 's21',
  password: 'root'
}

async function startMockServer () {
  const server = createServer(MOCK_OPTS)
  await waitForPort(MOCK_OPTS.host, MOCK_PORT, { timeout: 5000 })
  return server
}

test('integration: Antminer getVersion against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getVersion()
  t.ok(result.success, 'getVersion succeeds')
  t.ok(result.platform != null || result.antminer?.firmware, 'platform or firmware is set')
})

test('integration: Antminer getSummary against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getSummary()
  t.ok(result.success, 'getSummary succeeds')
  t.ok(typeof result.mhs_av === 'number', 'mhs_av is number')
  t.ok(typeof result.mhs_5s === 'number', 'mhs_5s is number')
  t.ok(typeof result.elapsed === 'number', 'elapsed is number')
})

test('integration: Antminer getMinerStats against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getMinerStats()
  t.ok(result.success, 'getMinerStats succeeds')
  t.ok(Array.isArray(result.boards), 'boards is array')
  t.ok(typeof result.minerMode === 'number', 'minerMode is number')
  t.ok(typeof result.mhs_av === 'number', 'mhs_av is number')
})

test('integration: Antminer getPools against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const pools = await miner.getPools()
  t.ok(Array.isArray(pools), 'getPools returns array')
  if (pools.length > 0) {
    t.ok(pools[0].url, 'pool has url')
    t.ok(typeof pools[0].accepted === 'number' || typeof pools[0].accepted === 'string', 'pool has accepted')
  }
})

test('integration: Antminer getDeviceConfiguration against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getDeviceConfiguration()
  t.ok(result.success, 'getDeviceConfiguration succeeds')
  t.ok(typeof result.frequency === 'number', 'frequency is number')
  t.ok(typeof result.fan_speed === 'number', 'fan_speed is number')
})

test('integration: Antminer getNetworkInformation against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getNetworkInformation()
  t.ok(result.success, 'getNetworkInformation succeeds')
  t.ok(result.type === 'dhcp' || result.type === 'static', 'type is dhcp or static')
  t.ok(result.network, 'network object present')
})

test('integration: Antminer getLED against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getLED()
  t.ok(result !== undefined, 'getLED returns value')
  t.ok(typeof result.blink === 'boolean' || typeof result === 'object', 'blink or object')
})

test('integration: Antminer getErrors against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getErrors()
  t.ok(result !== undefined, 'getErrors returns')
  t.ok(Array.isArray(result.errors), 'errors is array')
})

test('integration: Antminer getPowerValue (s21) against mock server', { timeout: 10000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21'
  })
  await miner._setupClient()

  const result = await miner.getPowerValue()
  t.ok(result.success, 'getPowerValue succeeds')
  t.ok(typeof result.power === 'number', 'power is number')
})

test('integration: Antminer getSnap (_prepSnap) against mock server', { timeout: 15000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const miner = new Antminer({
    address: MOCK_OPTS.host,
    port: MOCK_PORT,
    errPort: MOCK_PORT,
    username: 'root',
    password: MOCK_OPTS.password,
    type: 's21',
    nominalEfficiencyWThs: 22
  })
  await miner._setupClient()

  const snap = await miner.getSnap()
  t.ok(snap, 'getSnap returns')
  t.ok(snap.stats, 'snap has stats')
  t.ok(snap.config, 'snap has config')
  t.ok(typeof snap.stats.hashrate_mhs === 'object', 'hashrate_mhs present')
  t.ok(typeof snap.stats.temperature_c === 'object', 'temperature_c present')
  t.ok(Array.isArray(snap.stats.pool_status), 'pool_status is array')
  t.ok(snap.config.firmware_ver, 'firmware_ver present')
})

test('integration: AntminerManager connectThing and collectThingSnap against mock server', { timeout: 15000 }, async (t) => {
  const server = await startMockServer()
  t.teardown(() => server.stop())

  const manager = new AntminerManagerS21({ thing: { miner: {} } }, { rack: 'test-rack' })
  const thg = {
    id: 'test-miner-1',
    opts: {
      address: MOCK_OPTS.host,
      port: MOCK_PORT,
      username: 'root',
      password: MOCK_OPTS.password
    }
  }

  const connected = await manager.connectThing(thg)
  t.is(connected, 1, 'connectThing returns 1')
  t.ok(thg.ctrl, 'thing has ctrl (miner instance)')

  const snap = await manager.collectThingSnap(thg)
  t.ok(snap, 'collectThingSnap returns')
  t.ok(snap.stats, 'snap has stats')
  t.ok(snap.config, 'snap has config')
  t.ok(typeof snap.stats.hashrate_mhs === 'object', 'hashrate_mhs present')
  t.ok(Array.isArray(snap.stats.pool_status), 'pool_status is array')
})
