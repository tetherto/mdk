'use strict'

// Unit tests for the site-backend site plugin controllers and plugin manifest.
// No real processes or network — all mdkClient calls are served by a fake in-process stub.

const test = require('brittle')
const path = require('path')
const overview = require('../../plugins/site/controllers/overview')
const history = require('../../plugins/site/controllers/history')
const command = require('../../plugins/site/controllers/command')
const { loadPlugin } = require('../../../../backend/core/gateway/workers/lib/plugin-loader')

const PLUGIN_DIR = path.join(__dirname, '..', '..', 'plugins', 'site')

// Maps each stub deviceId to its deviceFamily so pullTelemetry({ type: 'config' }) works.
const FAMILY = {
  'whatsminer-0': 'miner',
  'antminer-0': 'miner',
  'avalon-0': 'miner',
  'c-mbt': 'container',
  'c-as': 'container',
  'c-bd': 'container',
  'pm-0': 'power-meter',
  'pm-satec': 'power-meter',
  'pm-schneider': 'power-meter',
  'sen-microbt': 'sensor',
  'minerpool-worker': 'minerpool',
  'f2pool-worker': 'minerpool'
}

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
          { workerId: 'container-worker', deviceIds: ['c-mbt'], state: 'READY' },
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

// --- plugin manifest ---

test('site plugin manifest loads with three routes and normalized paths', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  t.is(plugin.routes.length, 3, 'three routes')
  const byId = Object.fromEntries(plugin.routes.map(r => [r.id, r]))
  t.is(byId['site.overview'].path, '/site/overview')
  t.is(byId['site.history'].path, '/site/history')
  t.is(byId['site.miner-command'].method, 'POST')
  t.is(byId['site.miner-command'].path, '/site/miners/:deviceId/command', 'path param normalized to :deviceId')
})

// --- overview controller ---

test('overview merges all miner families and containers', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })

  t.is(out.miners.length, 30, '30 miners across 3 families')
  t.is(out.totals.minerCount, 30)
  t.is(out.containers.length, 3, '3 containers')
  t.alike(out.containers.map((c) => c.id), ['container-antspace', 'container-bitdeer', 'container-microbt'], 'containers sorted by id')
  t.is(out.containers.find(c => c.id === 'container-microbt').minerCount, 10)
  t.is(out.containers.find(c => c.id === 'container-antspace').minerCount, 10)
  t.is(out.containers.find(c => c.id === 'container-bitdeer').minerCount, 10)
})

test('overview reports totals: hashrate, power, online count', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })
  t.ok(out.totals.hashrateMhs > 0, 'total hashrate aggregated')
  t.ok(out.totals.powerW > 0, 'total power aggregated')
  t.is(out.totals.onlineCount, 30, 'all 30 mining miners counted online')
})

test('overview reports both pools', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })
  t.is(out.pools.length, 2, 'two pools from ext_data stats')
  t.is(out.pools.find((p) => p.poolType === 'ocean').hashrate, 104.7e12)
  t.is(out.pools.find((p) => p.poolType === 'f2pool').hashrate, 50e12)
})

test('overview reports sensors and maps inlet temps to containers', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })
  t.is(out.sensors.length, 3, 'lists each inlet sensor')
  t.is(out.sensors.find((s) => s.container === 'container-microbt').tempC, 22.5)
  t.is(out.containers.find(c => c.id === 'container-microbt').inletTempC, 22.5)
  t.is(out.containers.find(c => c.id === 'container-antspace').inletTempC, 24.0)
})

test('overview aggregates site power across all three powermeter vendors', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })
  t.is(out.site.powerW, 560000, 'site power sums all three powermeters (360k + 120k + 80k)')
  t.is(out.site.currentA, 800, 'site current sums phase-1 A across vendors (500 + 200 + 100)')
  t.is(out.powermeters.length, 3, 'lists each site powermeter')
  t.is(out.powermeters.find((p) => p.deviceId === 'pm-0').powerW, 360000)
  t.is(out.powermeters.find((p) => p.deviceId === 'pm-satec').label, 'SATEC PM180')
  t.is(out.powermeters.find((p) => p.deviceId === 'pm-schneider').label, 'Schneider PM5340')
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

test('overview skips TERMINATED workers', async (t) => {
  const client = fakeMdkClient()
  const orig = client.listWorkers
  client.listWorkers = async () => {
    const res = await orig()
    res.workers = res.workers.map(w =>
      w.workerId === 'avalon-worker' ? { ...w, state: 'TERMINATED' } : w
    )
    return res
  }
  const out = await overview({ params: {}, query: {} }, { mdkClient: client })
  t.is(out.miners.filter(m => m.code && m.code.startsWith('AV')).length, 0, 'avalon miners excluded')
})

test('overview throws when mdkClient is unavailable', async (t) => {
  await t.exception(() => overview({ params: {}, query: {} }, { mdkClient: null }), /ERR_MDK_CLIENT_UNAVAILABLE/)
})

// --- history controller ---

test('history temperature reads the sensor tail-log series', async (t) => {
  const client = fakeMdkClient()
  const out = await history({ query: { metric: 'temperature' } }, { mdkClient: client })
  t.is(out.unit, '°C')
  t.is(out.deviceId, 'site-aggregate')
  t.is(out.log.length, 3)
  t.is(out.log[0].value, 23.166666666666668, 'averages all three sensors at each timestamp')
})

test('history temperature for a single sensor when deviceId is set', async (t) => {
  const one = await history({ query: { metric: 'temperature', deviceId: 'sen-microbt' } }, { mdkClient: fakeMdkClient() })
  t.is(one.deviceId, 'sen-microbt')
  t.is(one.log[0].value, 22.5, 'single-sensor history not averaged')
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
})

test('history power for a single meter when deviceId is set', async (t) => {
  const abb = await history({ query: { metric: 'power', deviceId: 'pm-0' } }, { mdkClient: fakeMdkClient() })
  t.is(abb.deviceId, 'pm-0')
  t.is(abb.log[0].value, 360000, 'single-meter history when deviceId is set')
})

test('history rejects unknown metric', async (t) => {
  await t.exception(() => history({ query: { metric: 'voltage' } }, { mdkClient: fakeMdkClient() }), /ERR_UNKNOWN_METRIC/)
})

test('history rejects invalid date range', async (t) => {
  const now = Date.now()
  await t.exception(() => history({ query: { metric: 'hashrate', start: now + 1000, end: now } }, { mdkClient: fakeMdkClient() }), /ERR_INVALID_DATE_RANGE/)
})

// --- command controller ---

test('command dispatches setPowerMode to the addressed miner', async (t) => {
  const commands = []
  const out = await command({ params: { deviceId: 'antminer-7' }, body: { mode: 'high' } }, { mdkClient: fakeMdkClient({ commands }) })
  t.is(commands.length, 1)
  t.is(commands[0].deviceId, 'antminer-7')
  t.is(commands[0].cmd, 'setPowerMode')
  t.is(out.status, 'QUEUED')
  t.is(out.commandId, 'cmd-1')
  t.is(out.mode, 'high')
})

test('command accepts all valid power modes', async (t) => {
  for (const mode of ['low', 'normal', 'high']) {
    const out = await command({ params: { deviceId: 'whatsminer-0' }, body: { mode } }, { mdkClient: fakeMdkClient() })
    t.is(out.status, 'QUEUED', `mode ${mode} accepted`)
  }
})

test('command rejects an invalid mode before dispatch', async (t) => {
  const commands = []
  await t.exception(() => command({ params: { deviceId: 'whatsminer-7' }, body: { mode: 'turbo' } }, { mdkClient: fakeMdkClient({ commands }) }), /ERR_INVALID_POWER_MODE/)
  t.is(commands.length, 0, 'no dispatch on invalid mode')
})

test('command throws when mdkClient is unavailable', async (t) => {
  await t.exception(() => command({ params: { deviceId: 'whatsminer-0' }, body: { mode: 'high' } }, { mdkClient: null }), /ERR_MDK_CLIENT_UNAVAILABLE/)
})

test('command throws when deviceId is missing', async (t) => {
  await t.exception(() => command({ params: {}, body: { mode: 'high' } }, { mdkClient: fakeMdkClient() }), /ERR_DEVICE_ID_REQUIRED/)
})
