'use strict'

/**
 * MDK ORK — Orchestration Shell
 *
 * Demonstrates the createORK factory with explicit lifecycle control.
 * Unlike getOrk(), createORK() does not start the ork or attach process
 * signals — the caller drives the full lifecycle.
 *
 * Shows:
 *   - All config fields specified explicitly (db, gateways, auth, cadences, discovery)
 *   - Manual init() → start() → SIGINT → stop() sequence
 *   - Lifecycle events: 'started', 'stopped'
 *   - CommandStateMachine 'command:done' events fired on every terminal transition
 *   - Scheduler cadence printed at startup
 *
 * Run:
 *   node backend/core/ork/examples/ork-shell.js
 *
 * Then copy any printed hp-rpc-cli line to a second terminal.
 * Ctrl+C stops the server cleanly (drain → close stores).
 */

const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { createORK } = require('../../../backend/core/ork/index')
const { startWorker, waitForDiscovery } = require('../../../backend/core/mdk')
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

  // Generate a fresh DHT topic for this run
  const topic = crypto.randomBytes(32).toString('hex')

  // ── createORK: explicit config, returns an unstarted OrkManager ──────
  const ork = createORK({
    db: path.join(os.tmpdir(), 'mdk', 'ork-shell-db'),
    gateways: {
      hrpc: { whitelist: [] }, // HRPC enabled, open whitelist (add pubkeys to restrict)
      ipc: false // IPC disabled — HRPC only for this example
    },
    auth: { whitelist: [] }, // shorthand for gateways.hrpc.whitelist
    discovery: { topic },
    cadences: {
      telemetryPullMs: 5000, // pull metrics from all workers every 5s
      healthPingMs: 3000 // ping all workers every 3s
    }
  })

  // Required by startWorker to coordinate DHT topic and cleanup hooks
  ork.topic = topic
  ork._cleanup = []

  // Lifecycle events — registered before start()
  ork.on('started', () => { console.log('  [ork] started') })
  ork.on('stopped', () => { console.log('  [ork] stopped') })

  // ── init() creates all modules; stateMachine is available after this ─
  await ork.init()

  // CSM event: fires on every terminal state (SUCCESS, FAILED, cancelled)
  // Register after init() — stateMachine is created inside init()
  ork.stateMachine.on('command:done', (data) => {
    const id = data.commandId.slice(0, 8)
    const err = data.error ? `  err=${data.error}` : ''
    console.log(`  [csm] command:done  id=${id}…  state=${data.state}${err}`)
  })

  // ── start() recovers state, starts gateways, scheduler, health monitor ─
  await ork.start()

  // Start a real WM_M56S worker and register it with the ork
  const { manager } = await startWorker(WM_M56S, { ork })

  await manager.registerThing({
    info: { serialNum: 'WM-001', container: 'rack-1' },
    opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]
  await waitForDiscovery(ork)

  const K = ork.getPublicKey().toString('hex')
  const conf = ork.conf.ork

  console.log(`\n  HRPC key:        ${K}`)
  console.log(`  Device:          ${deviceId}`)
  console.log(`  Telemetry pull:  every ${conf.telemetryPullMs}ms`)
  console.log(`  Health ping:     every ${conf.healthPingMs}ms\n`)

  console.log('  # Reads')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('worker.list', {})}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('device.capabilities', {}, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'metrics' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'stats' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'list' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'logs', limit: 10 } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'settings' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('state.pull', {}, deviceId)}'`)

  console.log('\n  # Commands (each fires a command:done event above)')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'reboot', params: {} }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerMode', params: { mode: 'low' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerMode', params: { mode: 'normal' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setLED', params: { enabled: true } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerPct', params: { pct: 80 } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setupPools', params: { pools: [{ url: 'stratum+tcp://ocean.xyz:3334', user: 'bc1q.worker1', pass: 'x' }] } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'saveComment', params: { text: 'Replaced fan #2', author: 'ops' } }, deviceId)}'`)

  console.log('\n  Ctrl+C to stop.\n')

  // ── Graceful shutdown: drain CSM, close stores, then exit ────────────
  // SIGINT handler is explicit here — createORK() attaches no signals.
  process.once('SIGINT', async () => {
    const forceExit = setTimeout(() => process.exit(0), 3000).unref()
    for (const fn of ork._cleanup) {
      try { await fn() } catch {}
    }
    try { await ork.stop() } catch {}
    clearTimeout(forceExit)
    process.exit(0)
  })
}

main().catch((err) => { console.error(err); process.exit(1) })
