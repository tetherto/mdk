'use strict'

const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { setTimeout: sleep } = require('timers/promises')
const { getKernel, startGateway } = require('../../../../backend/core/mdk')
const { startAvalonWorker } = require('../../../../backend/workers/miners/avalon')
const avMockServer = require('../../../../backend/workers/miners/avalon/mock/server')
const mock = require('../../utils/mock')

const BASE_DIR = path.join(os.tmpdir(), 'mdk-site-avalon')
const KERNEL_ROOT = path.join(BASE_DIR, 'kernel')

const main = async () => {
  // Setup mock for the Avalon A1346 miner
  await mock.run(avMockServer, '127.0.0.1', 14031, 'a1346')
  await sleep(500)

  // Initialize the Kernel
  const kernelTopic = crypto.randomBytes(32).toString('hex')
  const kernel = await getKernel({
    topic: kernelTopic,
    root: KERNEL_ROOT
  })
  console.log('\n  Kernel HRPC key:', kernel.getPublicKey().toString('hex'))

  // Start the server
  await startGateway({
    kernel,
    port: 3000,
    noAuth: true // Disable auth for brevity in this example.
  })
  console.log('MDK running at http://localhost:3000')
  await sleep(1000)

  // Setup an Avalon A1346 worker on the runtime
  const worker = await startAvalonWorker({
    workerId: 'avalon-a1346-demo',
    model: 'a1346',
    storeDir: path.join(BASE_DIR, 'worker-store'),
    seedDevices: [{
      info: { container: 'av-1', serialNum: 'AV001' },
      opts: { address: '127.0.0.1', port: 14031, password: 'admin' }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const avA1346DeviceId = worker.services.provisioning.listDeviceIds()[0]
  console.log('  Device:', avA1346DeviceId)

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
