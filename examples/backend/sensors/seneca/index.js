'use strict'

const os = require('os')
const path = require('path')

// This example lives under examples/backend/sensors/seneca/, so the repo root is
// four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { getOrk, startWorker } = require(path.join(REPO_ROOT, 'backend', 'core', 'mdk'))
const { SENECA } = require(path.join(REPO_ROOT, 'backend', 'workers', 'temperature', 'seneca'))
const mockServer = require(path.join(REPO_ROOT, 'backend', 'workers', 'temperature', 'seneca', 'mock', 'server'))

const HOST = '127.0.0.1'
const PORT = 5050
const ORK_ROOT = path.join(os.tmpdir(), 'mdk-site-seneca', 'ork')

const main = async () => {
  // The Seneca mock speaks Modbus TCP, so no real sensor is needed.
  mockServer.createServer({ host: HOST, port: PORT, type: 'seneca' })

  // HRPC only — this example is inspected with hp-rpc-cli, so the IPC gateway is off.
  const ork = await getOrk({ root: ORK_ROOT, ipc: false })
  const { manager } = await startWorker(SENECA, { ork })
  await manager.registerThing({
    info: { serialNum: 'SEN-001' },
    opts: { address: HOST, port: PORT, unitId: 0, register: 3 }
  })

  const key = ork.getPublicKey().toString('hex')
  const deviceId = Object.keys(manager.mem.things)[0]
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

  console.log('[mdk-seneca]', 'ORK HRPC key:', key)
  console.log('[mdk-seneca]', 'Device:', deviceId)
  console.log('[mdk-seneca]', 'Pull live telemetry over HRPC (run in a second terminal):')
  console.log(`  hp-rpc-cli -s ${key} -m mdk -d '${envelope}'`)
  console.log('[mdk-seneca]', 'Sensor worker is live. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-seneca] Fatal:', err)
  process.exit(1)
})
