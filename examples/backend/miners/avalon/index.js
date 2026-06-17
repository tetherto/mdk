'use strict'

const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { setTimeout: sleep } = require('timers/promises')
const { getOrk, startWorker, startAppNode } = require('../../../../backend/core/mdk')
const { AV_A1346 } = require('../../../../backend/workers/miners/avalon')
const avMockServer = require('../../../../backend/workers/miners/avalon/mock/server')
const mock = require('../../utils/mock')

const BASE_DIR = path.join(os.tmpdir(), 'mdk-site-avalon')
const ORK_ROOT = path.join(BASE_DIR, 'ork')
const ORK_IPC_SOCK = path.join(ORK_ROOT, 'ork.sock')

const main = async () => {
  // Setup mock for the Avalon A1346 miner
  await mock.run(avMockServer, '127.0.0.1', 14031, 'a1346')
  await sleep(500)

  // Initialize the ORK
  const orkTopic = crypto.randomBytes(32).toString('hex')
  const ork = await getOrk({
    topic: orkTopic,
    root: ORK_ROOT,
    ipc: { path: ORK_IPC_SOCK }
  })
  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))

  // Start the server
  await startAppNode({
    ork,
    port: 3000,
    orkIpc: ORK_IPC_SOCK,
    noAuth: true // Disable auth for brevity in this example.
  })
  console.log('MDK running at http://localhost:3000')
  await sleep(1000)

  // Setup an Avalon A1346 worker
  const { manager } = await startWorker(AV_A1346, { ork })
  await manager.registerThing({
    info: { container: 'av-1', serialNum: 'AV001' },
    opts: { address: '127.0.0.1', port: 14031, password: 'admin' }
  })
  const avA1346DeviceId = Object.keys(manager.mem.things)[0]
  console.log('  Device:', avA1346DeviceId)

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
