'use strict'

const os = require('os')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')
const { getKernel } = require('../../../backend/core/mdk')
const { startSenecaWorker } = require('../../../backend/workers/temperature/seneca')
const srv = require('../../../backend/workers/temperature/seneca/mock/server')

async function main () {
  srv.createServer({ host: '127.0.0.1', port: 5030, type: 'seneca' })
  await sleep(500)

  const kernel = await getKernel()
  const worker = await startSenecaWorker({
    workerId: 'seneca-sensor-client-demo',
    storeDir: path.join(os.tmpdir(), 'mdk', 'client-sensor', 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'SEN-001' },
      opts: { address: '127.0.0.1', port: 5030, unitId: 0, register: 3 }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]

  console.log('\n  Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
