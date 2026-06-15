'use strict'

/**
 * MDK ORK — Command Flow
 *
 * Starts a real Whatsminer M56S worker backed by the hardware simulator,
 * waits for ORK discovery, then prints ready-to-run hp-rpc-cli commands
 * for every operation in the whatsminer contract.
 *
 * Run:
 *   node backend/core/ork/examples/command-flow.js
 *
 * Then copy any printed hp-rpc-cli line to a second terminal.
 * Ctrl+C to stop.
 */

const { getOrk, startWorker, waitForDiscovery } = require('../../mdk')
const { WM_M56S } = require('../../../workers/miners/whatsminer')
const wmMock = require('../../../workers/miners/whatsminer/mock/server')

const MOCK_PORT = 14030

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

  const ork = await getOrk()
  const { manager } = await startWorker(WM_M56S, { ork })

  await manager.registerThing({
    info: { serialNum: 'WM-001', container: 'rack-1' },
    opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]
  await waitForDiscovery(ork)

  const K = ork.getPublicKey().toString('hex')

  console.log(`\n  HRPC key: ${K}`)
  console.log(`  Device:   ${deviceId}\n`)

  console.log('  # Reads')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('worker.list', {})}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('device.capabilities', {}, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'metrics' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'list' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'count' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'stats' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'logs', limit: 10 } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'settings' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'config' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('state.pull', {}, deviceId)}'`)

  console.log('\n  # Commands')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'reboot', params: {} }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerMode', params: { mode: 'low' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerMode', params: { mode: 'normal' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setLED', params: { enabled: true } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerPct', params: { pct: 80 } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setupPools', params: { pools: [{ url: 'stratum+tcp://ocean.xyz:3334', user: 'bc1q.worker1', pass: 'x' }] } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'saveSettings', params: { autoReconnect: true } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'saveComment', params: { text: 'Replaced fan #2', author: 'ops' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'updateThing', params: { info: { location: 'Row A, Slot 3' } } }, deviceId)}'`)

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
