'use strict'

const path = require('path')
const os = require('os')
const { getKernel } = require('../../../backend/core/mdk')
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  const kernel = await getKernel()

  const worker = await startWhatsminerWorker({
    workerId: 'whatsminer-m56s-client-demo',
    model: 'm56s',
    storeDir: path.join(os.tmpdir(), 'mdk', 'client-miner', 'worker-store'),
    seedDevices: [{
      info: { container: 'site-1', serialNum: 'WM001' },
      opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]

  console.log('\n  Kernel HRPC key:', kernel.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
