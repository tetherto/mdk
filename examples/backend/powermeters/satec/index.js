'use strict'

const os = require('os')
const path = require('path')

// This example lives under examples/backend/powermeters/satec/, so the repo root is
// four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { getOrk, startWorker } = require(path.join(REPO_ROOT, 'backend', 'core', 'mdk'))
const { SATEC } = require(path.join(REPO_ROOT, 'backend', 'workers', 'power-meter', 'satec'))
const mockServer = require(path.join(REPO_ROOT, 'backend', 'workers', 'power-meter', 'satec', 'mock', 'server'))

const HOST = '127.0.0.1'
const PORT = 5061
const ORK_ROOT = path.join(os.tmpdir(), 'mdk-site-satec', 'ork')

const main = async () => {
  // The Satec mock speaks Modbus TCP, so no real power meter is needed.
  mockServer.createServer({ host: HOST, port: PORT, type: 'pm180' })

  // HRPC only — this example is inspected with hp-rpc-cli, so the IPC gateway is off.
  const ork = await getOrk({ root: ORK_ROOT, ipc: false })
  const { manager } = await startWorker(SATEC, { ork })
  await manager.registerThing({
    info: { serialNum: 'SATEC-1', container: 'container-A' },
    opts: { address: HOST, port: PORT, unitId: 1 }
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

  console.log('[mdk-satec]', 'ORK HRPC key:', key)
  console.log('[mdk-satec]', 'Device:', deviceId)
  console.log('[mdk-satec]', 'Pull live telemetry over HRPC (run in a second terminal):')
  console.log(`  hp-rpc-cli -s ${key} -m mdk -d '${envelope}'`)
  console.log('[mdk-satec]', 'Power meter worker is live. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-satec] Fatal:', err)
  process.exit(1)
})
