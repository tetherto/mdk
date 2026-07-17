'use strict'

const os = require('os')
const path = require('path')

// This example lives under examples/backend/sensors/seneca/, so the repo root is
// four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { getKernel } = require(path.join(REPO_ROOT, 'backend', 'core', 'mdk'))
const { startSenecaWorker } = require(path.join(REPO_ROOT, 'backend', 'workers', 'temperature', 'seneca'))
const mockServer = require(path.join(REPO_ROOT, 'backend', 'workers', 'temperature', 'seneca', 'mock', 'server'))

const HOST = '127.0.0.1'
const PORT = 5050
const BASE_DIR = path.join(os.tmpdir(), 'mdk-site-seneca')
const KERNEL_ROOT = path.join(BASE_DIR, 'kernel')

const main = async () => {
  // The Seneca mock speaks Modbus TCP, so no real sensor is needed.
  mockServer.createServer({ host: HOST, port: PORT, type: 'seneca' })

  // HRPC only — this example is inspected with hp-rpc-cli.
  const kernel = await getKernel({ root: KERNEL_ROOT })
  const worker = await startSenecaWorker({
    workerId: 'seneca-sensor-demo',
    storeDir: path.join(BASE_DIR, 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'SEN-001' },
      opts: { address: HOST, port: PORT, unitId: 0, register: 3 }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const key = kernel.getPublicKey().toString('hex')
  const deviceId = worker.services.provisioning.listDeviceIds()[0]
  const envelope = JSON.stringify({
    id: '1',
    version: '0.1.0',
    type: 'request',
    action: 'telemetry.pull',
    sender: 'cli',
    deviceId,
    timestamp: Date.now(),
    payload: { query: { type: 'metrics' } }
  })

  console.log('[mdk-seneca]', 'Kernel HRPC key:', key)
  console.log('[mdk-seneca]', 'Device:', deviceId)
  console.log('[mdk-seneca]', 'Pull live telemetry over HRPC (run in a second terminal):')
  console.log(`  hp-rpc-cli -s ${key} -m mdk -d '${envelope}'`)
  console.log('[mdk-seneca]', 'Sensor worker is live. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-seneca] Fatal:', err)
  process.exit(1)
})
