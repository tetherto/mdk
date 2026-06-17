'use strict'

const os = require('os')
const path = require('path')

// This example lives under examples/backend/powermeters/abb/, so the repo root is
// four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { getOrk, startWorker } = require(path.join(REPO_ROOT, 'backend', 'core', 'mdk'))
const { ABB_B23 } = require(path.join(REPO_ROOT, 'backend', 'workers', 'power-meter', 'abb'))
const mockServer = require(path.join(REPO_ROOT, 'backend', 'workers', 'power-meter', 'abb', 'mock', 'server'))

const HOST = '127.0.0.1'
const PORT = 5060
const ORK_ROOT = path.join(os.tmpdir(), 'mdk-site-abb', 'ork')

const main = async () => {
  // The ABB mock speaks Modbus TCP, so no real power meter is needed.
  mockServer.createServer({ host: HOST, port: PORT, type: 'B23' })

  // HRPC only — this example is inspected with hp-rpc-cli, so the IPC gateway is off.
  const ork = await getOrk({ root: ORK_ROOT, ipc: false })
  const { manager } = await startWorker(ABB_B23, { ork })
  await manager.registerThing({
    info: { serialNum: 'B23-1' },
    opts: { address: HOST, port: PORT, unitId: 0 }
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

  console.log('[mdk-abb]', 'ORK HRPC key:', key)
  console.log('[mdk-abb]', 'Device:', deviceId)
  console.log('[mdk-abb]', 'Pull live telemetry over HRPC (run in a second terminal):')
  console.log(`  hp-rpc-cli -s ${key} -m mdk -d '${envelope}'`)
  console.log('[mdk-abb]', 'Power meter worker is live. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-abb] Fatal:', err)
  process.exit(1)
})
