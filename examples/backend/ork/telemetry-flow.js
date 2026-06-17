'use strict'

/**
 * MDK ORK — Telemetry Flow
 *
 * Starts a real Whatsminer M56S worker backed by the hardware simulator,
 * subscribes to the scheduler-driven telemetry pull loop (every 3 s),
 * prints live metrics on each tick, and lists ready-to-run hp-rpc-cli
 * commands for every telemetry query type and state.pull.
 *
 * Run:
 *   node backend/core/ork/examples/telemetry-flow.js
 *
 * Then copy any printed hp-rpc-cli line to a second terminal.
 * Ctrl+C to stop.
 */

const { getOrk, startWorker, waitForDiscovery } = require('../../../backend/core/mdk')
const { WM_M56S } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

const MOCK_PORT = 14031

function e (action, payload, deviceId) {
  return JSON.stringify({
    id: '1',
    version: '0.1.0',
    type: 'request',
    action,
    sender: 'cli',
    target: null,
    deviceId: deviceId || null,
    timestamp: Date.now(),
    payload: payload || {}
  })
}

async function main () {
  wmMock.createServer({ port: MOCK_PORT, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  // Short pull interval so live output is visible quickly
  const ork = await getOrk({ telemetryPullMs: 3000 })
  const { manager } = await startWorker(WM_M56S, { ork })

  await manager.registerThing({
    info: { serialNum: 'WM-001', container: 'rack-1' },
    opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]
  await waitForDiscovery(ork)

  const K = ork.getPublicKey().toString('hex')

  // Subscribe: print a summary line on every scheduler-driven pull
  ork.telemetryCollector.subscribe(deviceId, (data) => {
    if (!data || !data.metrics) return
    const s = (data.metrics.stats) || {}
    const hr = s.hashrate_mhs ? (s.hashrate_mhs.avg / 1e6).toFixed(2) + ' TH/s' : '-'
    const pw = s.power_w != null ? s.power_w + ' W' : '-'
    const tp = s.temperature_c ? s.temperature_c.max + '°C' : '-'
    console.log(`  [tick] ${deviceId}  hashrate=${hr}  power=${pw}  temp=${tp}  status=${s.status || '-'}`)
  })

  console.log(`\n  HRPC key: ${K}`)
  console.log(`  Device:   ${deviceId}`)
  console.log('  Scheduler pull interval: 3 s\n')

  console.log('  # Telemetry reads')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'metrics' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'list' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'count' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'stats' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'logs', limit: 10 } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'settings' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'config' } }, deviceId)}'`)

  console.log('\n  # State snapshot')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('state.pull', {}, deviceId)}'`)

  console.log('\n  # Fleet')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('worker.list', {})}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('device.capabilities', {}, deviceId)}'`)

  console.log('\n  Live telemetry (every 3 s):\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
