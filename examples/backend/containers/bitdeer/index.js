'use strict'

const os = require('os')
const path = require('path')

// This example lives under examples/backend/containers/bitdeer/, so the repo root
// is four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { getKernel } = require(path.join(REPO_ROOT, 'backend', 'core', 'mdk'))
const { startBitdeerWorker } = require(path.join(REPO_ROOT, 'backend', 'workers', 'containers', 'bitdeer'))
const mockServer = require(path.join(REPO_ROOT, 'backend', 'workers', 'containers', 'bitdeer', 'mock', 'server'))

const HOST = '127.0.0.1'
// The Bitdeer worker embeds its MQTT broker on DEFAULT_MQTT_PORT (10883); the mock
// connects to it as a client, so this matches the broker port.
const PORT = 10883
const TYPE = 'd40_m56'
const CONTAINER_ID = 'C024_D40'
const BASE_DIR = path.join(os.tmpdir(), 'mdk-site-bitdeer')
const KERNEL_ROOT = path.join(BASE_DIR, 'kernel')
const BITDEER_DIR = path.join(REPO_ROOT, 'backend', 'workers', 'containers', 'bitdeer')

const main = async () => {
  // HRPC only — this example is inspected with hp-rpc-cli.
  const kernel = await getKernel({ root: KERNEL_ROOT })

  // Bitdeer speaks MQTT and the worker hosts the broker, so start the worker
  // first, then point the mock (an MQTT client) at the broker it now exposes.
  const worker = await startBitdeerWorker({
    workerId: 'bitdeer-d40-m56-demo',
    model: 'm56',
    mqttPort: PORT,
    storeDir: path.join(BASE_DIR, 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'D40-M56-001', container: 'container-A' },
      opts: { containerId: CONTAINER_ID }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  // The Bitdeer mock resolves its canned MQTT payloads relative to process.cwd()
  // (the worker package root), so run it from there. Every path here is absolute.
  process.chdir(BITDEER_DIR)
  mockServer.createServer({ host: HOST, port: PORT, type: TYPE, id: CONTAINER_ID })

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

  console.log('[mdk-bitdeer]', 'Kernel HRPC key:', key)
  console.log('[mdk-bitdeer]', `Device: ${deviceId} (container ${CONTAINER_ID})`)
  console.log('[mdk-bitdeer]', 'Pull live telemetry over HRPC (run in a second terminal):')
  console.log(`  hp-rpc-cli -s ${key} -m mdk -d '${envelope}'`)
  console.log('[mdk-bitdeer]', 'Container worker is live. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-bitdeer] Fatal:', err)
  process.exit(1)
})
