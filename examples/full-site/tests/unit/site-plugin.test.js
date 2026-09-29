'use strict'

const test = require('brittle')
const path = require('path')
const overview = require('../../plugins/site/controllers/overview')
const history = require('../../plugins/site/controllers/history')
const command = require('../../plugins/site/controllers/command')
const ocean = require('../../plugins/site/controllers/ocean')
const { loadPlugin } = require('../../../../backend/core/gateway/workers/lib/plugin-loader')

const PLUGIN_DIR = path.join(__dirname, '..', '..', 'plugins', 'site')

function minerThing (i, { id, container, code, powerMode = 'normal' }) {
  return {
    id,
    code,
    type: code.startsWith('WM') ? 'miner-wm-m56s' : code.startsWith('AM') ? 'miner-am-s19xp' : 'miner-av-a1346',
    info: { container, pos: `${Math.floor(i / 20) + 1}_${(i % 20) + 1}` },
    last: {
      snap: {
        stats: { status: 'mining', power_w: 3300, hashrate_mhs: { t_5m: 100e6, avg: 100e6 }, temperature_c: { avg: 65 } },
        config: { power_mode: powerMode }
      }
    }
  }
}

function containerThing ({ id, container, code, status = 'running', powerW = 400000 }) {
  return {
    id,
    code,
    type: code,
    info: { container },
    last: { snap: { stats: { status, power_w: powerW, ambient_temp_c: 24 } } }
  }
}

const FAMILY = {
  'whatsminer-0': 'miner',
  'antminer-0': 'miner',
  'avalon-0': 'miner',
  'c-as': 'container',
  'c-bd': 'container',
  'pm-0': 'power-meter',
  'pm-satec': 'power-meter',
  'pm-schneider': 'power-meter',
  'sen-microbt': 'sensor',
  'minerpool-worker': 'minerpool',
  'f2pool-worker': 'minerpool'
}

function fakeMdkClient ({ commands } = {}) {
  const wmMiners = Array.from({ length: 10 }, (_, i) => minerThing(i, { id: `whatsminer-${i}`, container: 'container-microbt', code: `WM-M56S-${i}`, powerMode: i === 0 ? 'low' : 'normal' }))
  const amMiners = Array.from({ length: 10 }, (_, i) => minerThing(i, { id: `antminer-${i}`, container: 'container-antspace', code: `AM-S19XP-${i}` }))
  const avMiners = Array.from({ length: 10 }, (_, i) => minerThing(i, { id: `avalon-${i}`, container: 'container-bitdeer', code: `AV-A1346-${i}` }))

  const containers = [
    containerThing({ id: 'c-as', container: 'container-antspace', code: 'container-as-hk3', powerW: 600000 }),
    containerThing({ id: 'c-bd', container: 'container-bitdeer', code: 'container-bd-d40-a1346', powerW: 700000 })
  ]
  const pmThing = { id: 'pm-0', code: 'POWERMETER-0001', type: 'powermeter-abb-b23', info: { pos: 'site' }, last: { snap: { stats: { power_w: 360000, tension_v: 415, powermeter_specific: { i1_a: 500 } } } } }
  const pmSatecThing = { id: 'pm-satec', code: 'POWERMETER-0002', type: 'powermeter-satec-pm180', info: { pos: 'site' }, last: { snap: { stats: { power_w: 120000, tension_v: 410, powermeter_specific: { instantaneous_values: { current_i1_a: 200 } } } } } }
  const pmSchneiderThing = { id: 'pm-schneider', code: 'POWERMETER-0003', type: 'powermeter-schneider-pm5340', info: { pos: 'site' }, last: { snap: { stats: { power_w: 80000, tension_v: 420, powermeter_specific: { instantaneous_values: { current_a_a: 100 } } } } } }
  const sensors = [
    { id: 'sen-microbt', code: 'SENSOR-0001', type: 'sensor-temp-seneca', info: { container: 'container-microbt', pos: 'inlet' }, last: { snap: { stats: { status: 'ok', temp_c: 22.5 } } } },
    { id: 'sen-antspace', code: 'SENSOR-0002', type: 'sensor-temp-seneca', info: { container: 'container-antspace', pos: 'inlet' }, last: { snap: { stats: { status: 'ok', temp_c: 24.0 } } } },
    { id: 'sen-bitdeer', code: 'SENSOR-0003', type: 'sensor-temp-seneca', info: { container: 'container-bitdeer', pos: 'inlet' }, last: { snap: { stats: { status: 'ok', temp_c: 23.0 } } } }
  ]

  const list = {
    'whatsminer-0': wmMiners,
    'antminer-0': amMiners,
    'avalon-0': avMiners,
    'c-as': [containers[0]],
    'c-bd': [containers[1]],
    'pm-0': [pmThing],
    'pm-satec': [pmSatecThing],
    'pm-schneider': [pmSchneiderThing],
    'sen-microbt': sensors
  }

  return {
    async listWorkers () {
      return {
        workers: [
          { workerId: 'whatsminer-worker', deviceIds: wmMiners.map(m => m.id), state: 'READY' },
          { workerId: 'antminer-worker', deviceIds: amMiners.map(m => m.id), state: 'READY' },
          { workerId: 'avalon-worker', deviceIds: avMiners.map(m => m.id), state: 'READY' },
          { workerId: 'antspace-worker', deviceIds: ['c-as'], state: 'READY' },
          { workerId: 'bitdeer-worker', deviceIds: ['c-bd'], state: 'READY' },
          { workerId: 'powermeter-worker', deviceIds: ['pm-0'], state: 'READY' },
          { workerId: 'satec-powermeter-worker', deviceIds: ['pm-satec'], state: 'READY' },
          { workerId: 'schneider-powermeter-worker', deviceIds: ['pm-schneider'], state: 'READY' },
          { workerId: 'seneca-sensor-worker', deviceIds: sensors.map(s => s.id), state: 'READY' },
          { workerId: 'minerpool-worker', deviceIds: ['minerpool-worker'], state: 'READY' },
          { workerId: 'f2pool-worker', deviceIds: ['f2pool-worker'], state: 'READY' }
        ]
      }
    },
    async pullTelemetry (deviceId, query) {
      if (query.type === 'config') return { config: { workerId: deviceId, contract: { deviceFamily: FAMILY[deviceId] } } }
      if (query.type === 'list') return { deviceId, things: list[deviceId] || [] }
      if (query.type === 'logs') {
        const base = 1000000
        const tempByDevice = { 'sen-microbt': 22.5, 'sen-antspace': 24.0, 'sen-bitdeer': 23.0 }
        if (tempByDevice[deviceId] != null) {
          const baseTemp = tempByDevice[deviceId]
          return { deviceId, logs: [0, 1, 2].map(i => ({ ts: base + i * 1000, snap: { stats: { temp_c: baseTemp + i } } })) }
        }
        const powerByDevice = { 'pm-0': 360000, 'pm-satec': 120000, 'pm-schneider': 80000 }
        const basePower = powerByDevice[deviceId] || 360000
        return { deviceId, logs: [0, 1, 2].map(i => ({ ts: base + i * 1000, snap: { stats: { power_w: basePower + i * 1000 } } })) }
      }
      if (query.type === 'ext_data' && query.key === 'stats') {
        if (deviceId === 'f2pool-worker') {
          return { extData: { ts: 1000, stats: [{ username: 'sample-f2pool-account', poolType: 'f2pool', hashrate: 50e12, hashrate_24h: 48e12, worker_count: 20, active_workers_count: 3, balance: 0.05, revenue_24h: 0.01 }] } }
        }
        return { extData: { ts: 1000, stats: [{ username: 'test', poolType: 'ocean', hashrate: 104.7e12, hashrate_24h: 102e12, worker_count: 50, active_workers_count: 5, balance: 0.12, revenue_24h: 0.03 }] } }
      }
      if (query.type === 'ext_data' && deviceId === 'minerpool-worker') {
        return { extData: oceanExtData(query) }
      }
      if (query.type === 'ext_data' && query.key === 'stats-history') {
        const base = 1000000
        return { extData: [0, 1, 2].map(i => ({ ts: base + i * 1000, stats: [{ hashrate: 100e12 + i * 1e12 }] })) }
      }
      return { deviceId }
    },
    async sendCommand (deviceId, cmd, params) {
      if (commands) commands.push({ deviceId, cmd, params })
      return { commandId: 'cmd-1', status: 'QUEUED' }
    }
  }
}

// ext_data fixtures for the Ocean pool worker: the keys PoolService serves plus
// the DATUM ones only the MiningOS worker (or the HRPC bridge) adds.
// `stratum-list` is omitted on purpose — on a real gateway it needs an admin
// password, so the controller must tolerate its absence.
function oceanExtData (query) {
  switch (query.key) {
    case 'workers':
      return {
        ts: 2000,
        workers: [
          { poolType: 'ocean', username: 'test', id: 'rig-a', name: 'rig-a', online: 1, last_updated: 1700000000, hashrate: 60e12, hashrate_1h: 58e12, hashrate_24h: 55e12 },
          { poolType: 'ocean', username: 'test', id: 'rig-b', name: 'rig-b', online: 0, last_updated: 1700000000, hashrate: 0, hashrate_1h: 1e12, hashrate_24h: 2e12 }
        ]
      }
    case 'alerts':
      return { ts: 4000, alerts: [{ uuid: 'a-1', name: 'Datum_Offline', description: 'DATUM gateway is offline', severity: 'critical', createdAt: 1700000000000 }] }
    case 'datum-stats':
      return { datum: { poolType: 'ocean', status: 'online', error: null, connections: 12, hashrate: 104.7 } }
    case 'datum-client-stats':
      return { acceptedShares: 9000, acceptedSharesDiff: 12345, rejectedShares: 12, rejectedSharesDiff: 34, ready: true, poolHost: 'datum.ocean.xyz:28915', poolTag: 'OCEAN', minerTag: 'mdk-site', poolMinDiff: 16384, poolPubKey: 'f00ba4'.repeat(10), uptime: 93784 }
    case 'stratum-info':
      return { activeThread: 4, totalConnections: 12, totalWorkSubscriptions: 11, estimatedHashrate: 104.7 }
    case 'stratum-job':
      return { block_height: 870200, block_value: 312500000, previous_block: '0000beef', block_target: '00ff', witness_commitment: 'aa', block_difficulty: 1.1e14, block_version: { int: 536870912, hex: '20000000' }, bits: '17030ecd', time: { current: 1700000500, minimum: 1700000000 }, limits: { size: 4000000, weight: 4000000, sigops: 80000 }, size: 1500000, weight: 3900000, sigops: 45000, tx_count: 3100 }
    case 'thread-stats':
      return { 1: { connection_count: 5, subscription_count: 5, approx_hashrate: 44.7 }, 0: { connection_count: 7, subscription_count: 6, approx_hashrate: 60 } }
    case 'coinbaser':
      return { bc1qpool: 300000000, bc1qminer: 12500000 }
    default:
      return undefined
  }
}

test('site plugin manifest loads with four routes and normalized paths', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  t.is(plugin.manifest.name, '@tetherto/mdk-plugin-full-site')
  t.is(plugin.routes.length, 4, 'four routes')
  const byId = Object.fromEntries(plugin.routes.map(r => [r.id, r]))
  t.is(byId['site.overview'].path, '/site/overview')
  t.is(byId['site.ocean'].path, '/site/ocean')
  t.is(byId['site.ocean'].method, 'GET')
  t.is(byId['site.miner-command'].method, 'POST')
  t.is(byId['site.miner-command'].path, '/site/miners/:deviceId/command', 'path param normalized to :deviceId')
})

test('overview merges all miner families and containers', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })

  t.is(out.miners.length, 30, '30 miners across 3 families')
  t.is(out.totals.minerCount, 30)
  t.is(out.containers.length, 3, '3 containers')
  t.alike(out.containers.map((c) => c.id), ['container-antspace', 'container-bitdeer', 'container-microbt'], 'containers sorted by id')
  t.is(out.containers.find(c => c.id === 'container-microbt').minerCount, 10)
  t.is(out.containers.find(c => c.id === 'container-antspace').minerCount, 10)
  t.is(out.containers.find(c => c.id === 'container-bitdeer').minerCount, 10)
  t.ok(out.pools.length === 2, 'two pools from ext_data stats')
  t.is(out.pools.find((p) => p.poolType === 'ocean').hashrate, 104.7e12)
  t.is(out.pools.find((p) => p.poolType === 'f2pool').hashrate, 50e12)
  t.is(out.sensors.length, 3, 'lists each inlet sensor')
  t.is(out.sensors.find((s) => s.container === 'container-microbt').tempC, 22.5)
  t.is(out.containers.find(c => c.id === 'container-microbt').inletTempC, 22.5)
  t.is(out.containers.find(c => c.id === 'container-antspace').inletTempC, 24.0)
  t.is(out.site.powerW, 560000, 'site power sums all three powermeters')
  t.is(out.site.currentA, 800, 'site current sums phase-1 across vendors')
  t.is(out.powermeters.length, 3, 'lists each site powermeter')
  t.is(out.powermeters.find((p) => p.deviceId === 'pm-0').powerW, 360000)
  t.is(out.powermeters.find((p) => p.deviceId === 'pm-satec').label, 'SATEC PM180')
})

test('overview synthesizes a container entry when miners reference an unknown container', async (t) => {
  const client = fakeMdkClient()
  const orig = client.pullTelemetry
  client.pullTelemetry = async (deviceId, query) => {
    if (query.type === 'list' && deviceId === 'whatsminer-0') {
      const res = await orig(deviceId, query)
      res.things = res.things.map((thg, i) => (
        i === 0 ? { ...thg, info: { ...thg.info, container: 'container-legacy' } } : thg
      ))
      return res
    }
    return orig(deviceId, query)
  }
  const out = await overview({ params: {}, query: {} }, { mdkClient: client })
  t.ok(out.containers.some(c => c.id === 'container-legacy'), 'orphan container synthesized')
  t.is(out.miners.filter(m => m.container === 'container-legacy').length, 1)
})

test('overview adapts a contract-classified worker without worker-infra queries', async (t) => {
  const client = fakeMdkClient()
  const origList = client.listWorkers
  client.listWorkers = async () => {
    const res = await origList()
    res.workers.push({ workerId: 'temp-worker', deviceIds: ['temp-0', 'temp-1'], state: 'READY' })
    return res
  }
  client.getCapabilities = async (deviceId) => (
    deviceId.startsWith('temp')
      ? { capabilities: { telemetry: [{ name: 'hashrate_rt' }, { name: 'power' }], commands: [{ name: 'setPowerMode' }] } }
      : { capabilities: null }
  )
  const origPull = client.pullTelemetry
  client.pullTelemetry = async (deviceId, query) => {
    if (!deviceId.startsWith('temp')) return origPull(deviceId, query)
    if (query.type === 'metrics') return { deviceId, metrics: { hashrate_rt: 180, power: 3400, temperature: 62, power_mode: 'eco' } }
    return { deviceId, error: `ERR_UNKNOWN_QUERY_TYPE: ${query.type}` }
  }

  const out = await overview({ params: {}, query: {} }, { mdkClient: client })
  t.is(out.miners.length, 32, 'adapted third-party miners join the overview')
  const temp = out.miners.find((m) => m.deviceId === 'temp-0')
  t.is(temp.container, 'rack-temp', 'grouped under a synthetic rack')
  t.is(temp.hashrateMhs, 180e6, 'TH/s adapted to MH/s')
  t.is(temp.status, 'mining')
  t.is(temp.powerMode, 'low', 'firmware eco mapped to the UI low mode')
  const rack = out.containers.find((c) => c.id === 'rack-temp')
  t.ok(rack, 'synthetic rack container synthesized')
  t.is(rack.minerCount, 2)
})

test('overview throws when mdkClient is unavailable', async (t) => {
  await t.exception(() => overview({ params: {}, query: {} }, { mdkClient: null }), /ERR_MDK_CLIENT_UNAVAILABLE/)
})

test('history temperature reads the sensor tail-log series', async (t) => {
  const client = fakeMdkClient()
  const out = await history({ query: { metric: 'temperature' } }, { mdkClient: client })
  t.is(out.unit, '°C')
  t.is(out.deviceId, 'site-aggregate')
  t.is(out.log.length, 3)
  t.is(out.log[0].value, 23.166666666666668, 'temperature history averages all sensors at each timestamp')

  const one = await history({ query: { metric: 'temperature', deviceId: 'sen-microbt' } }, { mdkClient: client })
  t.is(one.deviceId, 'sen-microbt')
  t.is(one.log[0].value, 22.5, 'single-sensor history when deviceId is set')
})

test('history hashrate reads the pool stats-history series', async (t) => {
  const out = await history({ query: { metric: 'hashrate' } }, { mdkClient: fakeMdkClient() })
  t.is(out.metric, 'hashrate')
  t.is(out.unit, 'TH/s')
  t.is(out.log.length, 3)
})

test('history power reads the powermeter tail-log series', async (t) => {
  const client = fakeMdkClient()
  const out = await history({ query: { metric: 'power' } }, { mdkClient: client })
  t.is(out.unit, 'W')
  t.is(out.deviceId, 'site-aggregate')
  t.is(out.log.length, 3)
  t.is(out.log[0].value, 560000, 'power history sums all site meters at each timestamp')

  const abb = await history({ query: { metric: 'power', deviceId: 'pm-0' } }, { mdkClient: client })
  t.is(abb.deviceId, 'pm-0')
  t.is(abb.log[0].value, 360000, 'single-meter history when deviceId is set')
})

test('command dispatches setPowerMode to the addressed miner', async (t) => {
  const commands = []
  const out = await command({ params: { deviceId: 'antminer-7' }, body: { mode: 'high' } }, { mdkClient: fakeMdkClient({ commands }) })
  t.is(commands.length, 1)
  t.is(commands[0].deviceId, 'antminer-7')
  t.is(commands[0].cmd, 'setPowerMode')
  t.is(out.status, 'QUEUED')
})

test('command rejects an invalid mode before dispatch', async (t) => {
  const commands = []
  await t.exception(() => command({ params: { deviceId: 'whatsminer-7' }, body: { mode: 'turbo' } }, { mdkClient: fakeMdkClient({ commands }) }), /ERR_INVALID_POWER_MODE/)
  t.is(commands.length, 0)
})

test('ocean returns only the ocean-type pool, with account, worker and alert detail', async (t) => {
  const out = await ocean({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })

  t.is(out.pools.length, 1, 'f2pool is filtered out — only poolType ocean appears')
  const pool = out.pools[0]
  t.is(pool.deviceId, 'minerpool-worker')
  t.is(pool.poolType, 'ocean')

  t.is(pool.accounts.length, 1)
  t.is(pool.accounts[0].username, 'test')
  t.is(pool.accounts[0].hashrate, 104.7e12)
  t.is(pool.accounts[0].activeWorkersCount, 5)
  t.is(pool.accounts[0].workerCount, 50)

  t.is(pool.workers.length, 2)
  t.is(pool.workers[0].name, 'rig-a')
  t.is(pool.workers[0].online, true, 'ocean serves online as 0|1; the route normalizes to boolean')
  t.is(pool.workers[1].online, false)

  t.is(pool.alerts.length, 1)
  t.is(pool.alerts[0].name, 'Datum_Offline')
})

test('ocean maps the DATUM gateway surface the pool worker proxies', async (t) => {
  const out = await ocean({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })
  const { gateway, gatewayAvailable } = out.pools[0]

  t.is(gatewayAvailable, true)
  t.is(gateway.status, 'online')
  t.is(gateway.connections, 12)
  t.is(gateway.hashrateThs, 104.7)

  t.is(gateway.clientStats.acceptedShares, 9000)
  t.is(gateway.clientStats.ready, true)
  t.is(gateway.clientStats.uptimeS, 93784)
  t.is(gateway.stratumInfo.activeThreads, 4)
  t.is(gateway.stratumInfo.estimatedHashrateThs, 104.7)

  t.is(gateway.job.blockHeight, 870200)
  t.is(gateway.job.blockValueBtc, 3.125, 'block_value sats converted to BTC')
  t.is(gateway.job.txCount, 3100)
  t.is(gateway.job.versionHex, '20000000')

  t.is(gateway.threads.length, 2)
  t.alike(gateway.threads.map(th => th.id), ['0', '1'], 'threads sorted by numeric id')
  t.is(gateway.threads[0].connectionCount, 7)

  t.is(gateway.clients.length, 0, 'admin-only stratum_client_list absent — empty, not an error')

  t.is(gateway.coinbaser.length, 2)
  t.is(gateway.coinbaser[0].address, 'bc1qpool', 'coinbaser sorted by value')
  t.is(gateway.coinbaser[0].valueBtc, 3)
})

test('ocean flattens the nested stratum client list when admin access is available', async (t) => {
  const client = fakeMdkClient()
  const orig = client.pullTelemetry
  client.pullTelemetry = async (deviceId, query) => {
    if (query.type === 'ext_data' && query.key === 'stratum-list' && deviceId === 'minerpool-worker') {
      return {
        extData: {
          0: {
            3: { remote_host: '10.0.0.5', auth_username: 'test.rig-a', subscribed: true, sid: '1a2b', sid_time: 900.5, last_share: 12.5, vdiff: 16384, accepted_diff: 1e9, accepted_count: 500, rejected_diff: 1e6, rejected_count: 2, rejected_percentage: 0.1, hash_rate: '60.25', hash_rate_age: 3.5, coinbase: 'OCEAN', useragent: 'cgminer/4.12' },
            4: { remote_host: '10.0.0.6', auth_username: 'test.rig-b', subscribed: false }
          }
        }
      }
    }
    return orig(deviceId, query)
  }

  const out = await ocean({ params: {}, query: {} }, { mdkClient: client })
  const clients = out.pools[0].gateway.clients
  t.is(clients.length, 2)
  t.is(clients[0].id, '0:3', 'row id is thread:client')
  t.is(clients[0].hashrateThs, 60.25, 'hash_rate string parsed')
  t.is(clients[0].authUsername, 'test.rig-a')
  t.is(clients[1].subscribed, false)
  t.is(clients[1].hashrateThs, 0, 'an unsubscribed client reports no hash_rate')
})

test('ocean reports the gateway unavailable when the pool worker serves no DATUM keys', async (t) => {
  const client = fakeMdkClient()
  const orig = client.pullTelemetry
  const DATUM_KEYS = new Set(['datum-stats', 'datum-client-stats', 'stratum-info', 'stratum-job', 'thread-stats', 'stratum-list', 'coinbaser'])
  client.pullTelemetry = async (deviceId, query) => {
    // What PoolService does with an unknown key: `this.data[key]`, i.e. undefined.
    if (query.type === 'ext_data' && DATUM_KEYS.has(query.key)) return { deviceId }
    return orig(deviceId, query)
  }

  const out = await ocean({ params: {}, query: {} }, { mdkClient: client })
  const pool = out.pools[0]
  t.is(pool.gatewayAvailable, false, 'mock-backed pool worker → no DATUM surface')
  t.is(pool.gateway.status, null)
  t.alike(pool.gateway.threads, [])
  t.is(pool.gateway.clientStats, null)
  t.is(pool.workers.length, 2, 'the Ocean sections still resolve')
})

test('ocean survives a failing ext_data pull without dropping the other sections', async (t) => {
  const client = fakeMdkClient()
  const orig = client.pullTelemetry
  client.pullTelemetry = async (deviceId, query) => {
    if (query.type === 'ext_data' && query.key === 'alerts') throw new Error('ERR_REMOTE_POOL: boom')
    return orig(deviceId, query)
  }

  const out = await ocean({ params: {}, query: {} }, { mdkClient: client })
  const pool = out.pools[0]
  t.alike(pool.alerts, [], 'the failing section degrades to empty')
  t.is(pool.workers.length, 2)
  t.is(pool.gateway.status, 'online')
})
