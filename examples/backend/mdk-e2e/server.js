'use strict'

/**
 * MDK E2E backend server.
 *
 * Always starts: Kernel + mock Whatsminer M56S + runtime-hosted MDK worker.
 * With --gateway: also starts gateway HTTP API on port 3000 (noAuth mode).
 *
 * Usage:
 *   node server.js              # Kernel + mock miner + worker
 *   node server.js --gateway   # + gateway HTTP API on :3000
 */

const path = require('path')
const os = require('os')
const { getKernel, startGateway } = require('../../../backend/core/mdk')
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

const withGateway = process.argv.includes('--gateway')

// Use sibling directories to avoid nested Corestore paths (which cause conflicts)
const EXAMPLE_TMP = path.join(os.tmpdir(), 'mdk-e2e')
const KERNEL_ROOT = path.join(EXAMPLE_TMP, 'kernel')
const GATEWAY_ROOT = path.join(EXAMPLE_TMP, 'gateway')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  const kernel = await getKernel({ root: KERNEL_ROOT })

  // Device set persists in the provisioning store; the seed applies only on
  // the first ever boot (empty store), later runs reload the stored config.
  const worker = await startWhatsminerWorker({
    workerId: 'whatsminer-m56s-e2e-server',
    model: 'm56s',
    storeDir: path.join(EXAMPLE_TMP, 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'WM-001', container: 'site-1' },
      opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]
  const K = kernel.getPublicKey().toString('hex')

  console.log(`\n  Kernel key:  ${K}`)
  console.log(`  Device:   ${deviceId}`)
  console.log(`\n  hp-rpc-cli -s ${K} -m mdk -d '{"id":"1","version":"0.1.0","type":"request","action":"worker.list","sender":"cli","timestamp":${Date.now()},"payload":{}}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '{"id":"2","version":"0.1.0","type":"request","action":"telemetry.pull","sender":"cli","deviceId":"${deviceId}","timestamp":${Date.now()},"payload":{"query":{"type":"metrics"}}}'`)

  if (withGateway) {
    await startGateway({ kernel, noAuth: true, port: 3000, root: GATEWAY_ROOT })
    console.log('\n  Gateway: http://localhost:3000 (noAuth mode)')
  }

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
