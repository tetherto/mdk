'use strict'

const test = require('brittle')
const { once } = require('node:events')
const path = require('path')
const { loadContract, createInstance } = require('@tetherto/mdk-worker')
const avMock = require('../../mock/server')

const PKG_DIR = path.join(__dirname, '..', '..')

async function startMock (t) {
  const mock = avMock.createServer({ host: '127.0.0.1', port: 0, type: 'a1346', serial: 'AV-T1', password: 'root', delay: 0 })
  await once(mock.server, 'listening')
  t.teardown(() => mock.exit())
  return mock.server.address().port
}

function instanceFor (id, opts, config = {}) {
  const { dir, entries } = loadContract(PKG_DIR)
  return createInstance({ dir, entries, device: { id, opts, env: {}, config, workerId: 'avalon-test' } })
}

const deviceOpts = (port) => ({ address: '127.0.0.1', port, password: 'root', type: 'miner-av-a1346' })

test('contract loads from the package root with every declared handler', (t) => {
  const { contract, entries, publishedContract } = loadContract(PKG_DIR)
  t.is(contract.metadata.provider, 'canaan')
  t.is(entries.telemetry.size, 9)
  t.is(entries.commands.size, 4)
  for (const entry of publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('device load validates the config', (t) => {
  t.exception(() => instanceFor('x', { port: 4028 }), /ERR_DEVICE_CONFIG_INVALID/)
  t.exception(() => instanceFor('x', { address: '127.0.0.1' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('telemetry handlers translate the CGMiner ASCII API', async (t) => {
  const port = await startMock(t)
  const instance = instanceFor('AV-T1', deviceOpts(port))
  const read = (name) => instance.telemetry.get(name)({})

  const hashrateAvg = await read('hashrate_avg')
  t.ok(typeof hashrateAvg === 'number' && hashrateAvg > 0, `hashrate_avg ${hashrateAvg} TH/s`)
  const power = await read('power')
  t.ok(typeof power === 'number' && power > 0, `power ${power} W`)
  t.ok(typeof await read('temperature') === 'number')
  t.ok(typeof await read('fan_speed') === 'number')
  t.ok(['mining', 'sleeping'].includes(await read('status')))
  t.ok(['sleep', 'normal', 'high'].includes(await read('power_mode')))
  t.ok(typeof await read('uptime') === 'number')
  const efficiency = await read('efficiency')
  t.ok(typeof efficiency === 'number' && efficiency > 0, `efficiency ${efficiency} W/TH`)
})

test('snap handler returns the full legacy snapshot shape', async (t) => {
  const port = await startMock(t)
  const instance = instanceFor('AV-T2', deviceOpts(port))

  const snap = await instance.telemetry.get('snap')({})
  t.is(snap.success, true)
  t.ok(snap.stats.status)
  t.ok(snap.stats.hashrate_mhs)
  t.ok(snap.stats.temperature_c)
  t.ok(Array.isArray(snap.stats.pool_status))
  t.ok(snap.config.pool_config)
  t.ok(snap.config.power_mode)
})

test('command handlers drive vendor write endpoints', async (t) => {
  const port = await startMock(t)
  const instance = instanceFor('AV-T3', deviceOpts(port))
  const run = (name, params) => instance.commands.get(name)(params)

  t.alike(await run('setLED', { enabled: false }), { success: true })
  t.alike(await run('setPowerMode', { mode: 'normal' }), { success: true })
  await t.exception(run('setPowerMode', { mode: 'bogus' }), /ERR_INVALID_MODE/)
  t.alike(await run('reboot', {}), { success: true })
})

test('setupPools without params uses the worker-level pool list', async (t) => {
  const port = await startMock(t)
  const pools = [{ url: 'stratum+tcp://pool.example:3333', user: 'worker', pass: 'x' }]
  const instance = instanceFor('AV-T4', deviceOpts(port), { pools })

  const result = await instance.commands.get('setupPools')({})
  t.is(result.success, true, result.error_msg)
})

test('an unreachable miner fails the snap channel with ERR_MINER_UNREACHABLE', async (t) => {
  const mock = avMock.createServer({ host: '127.0.0.1', port: 0, type: 'a1346', serial: 'AV-DOWN', password: 'root' })
  await once(mock.server, 'listening')
  const port = mock.server.address().port
  mock.exit()
  const instance = instanceFor('AV-DOWN', { ...deviceOpts(port), timeout: 1000 })

  await t.exception(instance.telemetry.get('snap')({}), /ERR_MINER_UNREACHABLE/)
  await t.exception(instance.telemetry.get('power')({}))
})
