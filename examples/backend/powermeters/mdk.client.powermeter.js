'use strict'

const os = require('os')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')
const { getKernel } = require('../../../backend/core/mdk')
const { startAbbWorker } = require('../../../backend/workers/power-meter/abb')
const srv = require('../../../backend/workers/power-meter/abb/mock/server')

async function main () {
  srv.createServer({ host: '127.0.0.1', port: 5020, type: 'B23' })
  await sleep(500)

  const kernel = await getKernel()
  const worker = await startAbbWorker({
    workerId: 'abb-b23-client-demo',
    model: 'b23',
    storeDir: path.join(os.tmpdir(), 'mdk', 'client-powermeter', 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'B23-1' },
      opts: { address: '127.0.0.1', port: 5020, unitId: 0 }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]

  console.log('\n  Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
