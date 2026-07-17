'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { DEFAULT_TOPIC_FILE } = require('../../../backend/core/mdk')
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  // Announce on a fresh topic and publish it to the well-known file so a
  // later `getKernel()` (dht-kernel.js) picks it up without coordination.
  const topic = crypto.randomBytes(32).toString('hex')
  fs.mkdirSync(path.dirname(DEFAULT_TOPIC_FILE), { recursive: true })
  fs.writeFileSync(DEFAULT_TOPIC_FILE, topic, 'utf8')

  await startWhatsminerWorker({
    workerId: 'whatsminer-m56s-dht',
    model: 'm56s',
    storeDir: path.join(os.tmpdir(), 'mdk', 'dht-worker', 'worker-store'),
    kernelTopic: topic,
    seedDevices: [{
      info: { serialNum: 'WM-001', container: 'site-1' },
      opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
    }]
  })

  console.log('\n  Worker running. Start the kernel in another terminal:')
  console.log('    node examples/backend/mdk-e2e/dht-kernel.js\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
