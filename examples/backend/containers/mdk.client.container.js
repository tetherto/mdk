'use strict'

const os = require('os')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')
const { getKernel } = require('../../../backend/core/mdk')
const { startAntspaceWorker } = require('../../../backend/workers/containers/antspace')
const mock = require('../utils/mock')
const srv = require('../../../backend/workers/containers/antspace/mock/server')

async function main () {
  await mock.run(srv, '127.0.0.1', 8000, 'hk3')
  await sleep(500)

  const kernel = await getKernel()

  const worker = await startAntspaceWorker({
    workerId: 'antspace-hk3-client-demo',
    model: 'hk3',
    storeDir: path.join(os.tmpdir(), 'mdk', 'client-container', 'worker-store'),
    seedDevices: [{
      info: { container: 'hk-1', serialNum: 'AS001' },
      opts: { address: '127.0.0.1', port: 8000 }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]

  console.log('\n  Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
