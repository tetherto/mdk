'use strict'

const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { setTimeout: sleep } = require('timers/promises')
const { getOrk, startWorker, startAppNode } = require('../../../../backend/core/mdk')
const { MBT_KEHUA, MBT_WONDERINT } = require('../../../../backend/workers/containers/microbt')
const mbtMockServer = require('../../../../backend/workers/containers/microbt/mock/server')
const mock = require('../../utils/mock')

const BASE_DIR = path.join(os.tmpdir(), 'mdk-site-microbt')
const ORK_ROOT = path.join(BASE_DIR, 'ork')
const ORK_IPC_SOCK = path.join(ORK_ROOT, 'ork.sock')

const main = async () => {
  // Setup mocks for containers
  await mock.run(mbtMockServer, '127.0.0.1', 15021, 'kehua')
  await mock.run(mbtMockServer, '127.0.0.1', 15022, 'wonderint')
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

  // Setup a MicroBt Kehua Container
  const { manager: mbtKehuaManager } = await startWorker(MBT_KEHUA, { ork })
  await mbtKehuaManager.registerThing({
    info: { container: 'mbt-k-1', serialNum: 'MBT001' },
    opts: { address: '127.0.0.1', port: 15021, username: 'admin', password: 'admin' }
  })
  const kehuaContainerDeviceId = Object.keys(mbtKehuaManager.mem.things)[0]
  console.log('  Device:', kehuaContainerDeviceId)

  // Setup a MicroBt Kehua Container
  const { manager: mbtWonderintManager } = await startWorker(MBT_WONDERINT, { ork })
  await mbtWonderintManager.registerThing({
    info: { container: 'mbt-w-1', serialNum: 'MBT002' },
    opts: { address: '127.0.0.1', port: 15022, username: 'admin', password: 'admin' }
  })
  const wonderIntContainerDeviceId = Object.keys(mbtWonderintManager.mem.things)[0]
  console.log('  Device:', wonderIntContainerDeviceId)

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
