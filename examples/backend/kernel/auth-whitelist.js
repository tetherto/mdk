'use strict'

/**
 * MDK Kernel — HRPC Auth Whitelist
 *
 * Shows how to restrict Kernel access to specific clients via the HRPC
 * firewall allowlist. Only clients whose DHT public key is in the
 * allowlist can connect; everyone else is refused at the network layer.
 *
 * To allow all clients (dev mode), pass an empty allowlist:
 *   getKernel({ hrpc: { whitelist: [] } })
 *
 * Run:
 *   node backend/core/kernel/examples/auth-whitelist.js
 *
 * To connect with hp-rpc-cli, allowlist its key first:
 *   1. hp-rpc-cli --print-key          # get your client key
 *   2. Add it to hrpc.whitelist below  # restart with that key
 *   3. Use the printed commands below  # all requests now authenticated
 *
 * Ctrl+C to stop.
 */

const path = require('path')
const os = require('os')
const DHT = require('../../../backend/core/kernel/node_modules/hyperdht')
const { getKernel, waitForDiscovery } = require('../../../backend/core/mdk')
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

const MOCK_PORT = 14032

function envelope (action, payload, deviceId) {
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

  // Generate a key pair for the authorized client (your Gateway's identity).
  // In production: load a persistent key pair instead of generating one each run.
  const authorizedKeyPair = DHT.keyPair()
  const authorizedHex = authorizedKeyPair.publicKey.toString('hex')

  const kernel = await getKernel({
    hrpc: {
      whitelist: [authorizedHex] // only this key can connect
      // whitelist: []            // open — all clients admitted (dev mode)
    }
  })

  const worker = await startWhatsminerWorker({
    workerId: 'whatsminer-m56s-auth-demo',
    model: 'm56s',
    storeDir: path.join(os.tmpdir(), 'mdk', 'auth-whitelist', 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'WM-001', container: 'rack-1' },
      opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]
  await waitForDiscovery(kernel)

  const K = kernel.getPublicKey().toString('hex')

  console.log(`\n  HRPC key:       ${K}`)
  console.log(`  Authorized key: ${authorizedHex}`)
  console.log()
  console.log('  # To use hp-rpc-cli, first run:  hp-rpc-cli --print-key')
  console.log('  # Replace authorizedHex in this file with that key and restart.')
  console.log()
  console.log('  # Reads')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${envelope('worker.list', {})}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${envelope('telemetry.pull', { query: { type: 'metrics' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${envelope('state.pull', {}, deviceId)}'`)
  console.log()
  console.log('  # Commands')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${envelope('command.request', { command: 'reboot', params: {} }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${envelope('command.request', { command: 'setPowerMode', params: { mode: 'low' } }, deviceId)}'`)

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
