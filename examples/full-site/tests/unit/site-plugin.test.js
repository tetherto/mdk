'use strict'

const test = require('brittle')
const path = require('path')
const overview = require('../../plugins/site/controllers/overview')
const history = require('../../plugins/site/controllers/history')
const command = require('../../plugins/site/controllers/command')
const { loadPlugin } = require('../../../../backend/core/app-node/workers/lib/plugin-loader')

const PLUGIN_DIR = path.join(__dirname, '..', '..', 'plugins', 'site')

// Things shaped exactly like the real worker telemetry (thg.last.snap.stats /
// .config), classified by contract deviceFamily — not thing type.
function minerThing (i) {
  return {
    id: `miner-${i}`,
    code: `WM-M56S-${String(i + 1).padStart(4, '0')}`,
    type: 'miner-wm-m56s',
    info: { container: 'container-1', pos: `A_${i + 1}` },
    last: {
      snap: {
        stats: { status: 'mining', power_w: 3300, hashrate_mhs: { t_5m: 100e6, avg: 100e6 }, temperature_c: { avg: 65 } },
        config: { power_mode: i === 0 ? 'low' : 'normal' }
      }
    }
  }
}

const FAMILY = { 'miner-0': 'miner', 'c-0': 'container', 'pm-0': 'power-meter', 'minerpool-worker': 'minerpool' }

function fakeMdkClient ({ commands } = {}) {
  const miners = Array.from({ length: 100 }, (_, i) => minerThing(i))
  const containerThing = { id: 'c-0', code: 'CONTAINER-0001', type: 'container-mbt-kehua', info: { container: 'container-1' }, last: { snap: { stats: { status: 'running', power_w: 1246720, ambient_temp_c: 24 } } } }
  const pmThing = { id: 'pm-0', code: 'POWERMETER-0001', type: 'powermeter-abb-b23', info: { pos: 'site' }, last: { snap: { stats: { power_w: 360000, tension_v: 415, powermeter_specific: { i1_a: 500 } } } } }

  const list = { 'miner-0': miners, 'c-0': [containerThing], 'pm-0': [pmThing] }

  return {
    async listWorkers () {
      return {
        workers: [
          { workerId: 'miner-worker', deviceIds: miners.map(m => m.id), state: 'READY' },
          { workerId: 'container-worker', deviceIds: ['c-0'], state: 'READY' },
          { workerId: 'powermeter-worker', deviceIds: ['pm-0'], state: 'READY' },
          { workerId: 'minerpool-worker', deviceIds: ['minerpool-worker'], state: 'READY' }
        ]
      }
    },
    async pullTelemetry (deviceId, query) {
      if (query.type === 'config') return { config: { workerId: deviceId, contract: { deviceFamily: FAMILY[deviceId] } } }
      if (query.type === 'list') return { deviceId, things: list[deviceId] || [] }
      if (query.type === 'logs') {
        const base = 1000000
        return { deviceId, logs: [0, 1, 2].map(i => ({ ts: base + i * 1000, snap: { stats: { power_w: 360000 + i * 1000 } } })) }
      }
      if (query.type === 'ext_data' && query.key === 'stats') {
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

test('site plugin manifest loads with three routes and normalized paths', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  t.is(plugin.manifest.name, '@tetherto/mdk-plugin-full-site')
  t.is(plugin.routes.length, 3, 'three routes')
  const byId = Object.fromEntries(plugin.routes.map(r => [r.id, r]))
  t.is(byId['site.overview'].path, '/site/overview')
  t.is(byId['site.miner-command'].method, 'POST')
  t.is(byId['site.miner-command'].path, '/site/miners/:deviceId/command', 'path param normalized to :deviceId')
})

test('overview groups 100 miners under the container with site power and pool', async (t) => {
  const out = await overview({ params: {}, query: {} }, { mdkClient: fakeMdkClient() })

  t.is(out.miners.length, 100, '100 miners')
  t.is(out.totals.minerCount, 100)
  t.is(out.totals.onlineCount, 100, 'all mining miners counted online')
  t.ok(out.miners.every(m => m.container === 'container-1'), 'all miners linked to the container')
  t.ok(out.miners.every(m => /^A_\d+$/.test(m.pos)), 'each miner has a pdu_socket position')
  t.is(out.container.id, 'container-1', 'container present')
  t.is(out.container.operatingStatus, 'running', 'container status from stats.status')
  t.is(out.site.powerW, 360000, 'site power from powermeter stats.power_w')
  t.is(out.miners[0].powerMode, 'low', 'per-miner power mode from config.power_mode')
  t.is(out.miners[0].hashrateMhs, 100e6, 'hashrate from hashrate_mhs.t_5m')
  t.ok(out.totals.hashrateMhs > 0, 'aggregate hashrate computed')
  t.ok(out.pool && out.pool.hashrate === 104.7e12, 'pool data from ext_data stats')
  t.is(out.pool.workersOnline, 5, 'pool workers from active_workers_count')
})

test('overview throws when mdkClient is unavailable', async (t) => {
  await t.exception(() => overview({ params: {}, query: {} }, { mdkClient: null }), /ERR_MDK_CLIENT_UNAVAILABLE/)
})

test('history hashrate reads the pool stats-history series', async (t) => {
  const out = await history({ query: { metric: 'hashrate' } }, { mdkClient: fakeMdkClient() })
  t.is(out.metric, 'hashrate')
  t.is(out.unit, 'TH/s')
  t.is(out.log.length, 3)
  t.ok(out.log[0].ts <= out.log[1].ts, 'sorted ascending by ts')
  t.ok(out.log[0].value > 0, 'hashrate values present')
})

test('history power reads the powermeter tail-log series', async (t) => {
  const out = await history({ query: { metric: 'power' } }, { mdkClient: fakeMdkClient() })
  t.is(out.unit, 'W')
  t.is(out.log.length, 3)
  t.ok(out.log.every(p => p.value >= 360000), 'site power values present')
})

test('command dispatches setPowerMode to the addressed miner', async (t) => {
  const commands = []
  const out = await command({ params: { deviceId: 'miner-7' }, body: { mode: 'high' } }, { mdkClient: fakeMdkClient({ commands }) })
  t.is(commands.length, 1)
  t.is(commands[0].deviceId, 'miner-7')
  t.is(commands[0].cmd, 'setPowerMode')
  t.is(commands[0].params.mode, 'high')
  t.is(out.status, 'QUEUED')
})

test('command rejects an invalid mode before dispatch', async (t) => {
  const commands = []
  await t.exception(() => command({ params: { deviceId: 'miner-7' }, body: { mode: 'turbo' } }, { mdkClient: fakeMdkClient({ commands }) }), /ERR_INVALID_POWER_MODE/)
  t.is(commands.length, 0, 'no command dispatched for invalid mode')
})
