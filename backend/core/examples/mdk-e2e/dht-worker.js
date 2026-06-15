'use strict'

const { startWorker } = require('../../mdk')
const { WM_M56S } = require('../../../workers/miners/whatsminer')
const wmMock = require('../../../workers/miners/whatsminer/mock/server')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  const { manager } = await startWorker(WM_M56S)

  await manager.registerThing({
    info: { serialNum: 'WM-001', container: 'site-1' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  })

  console.log('\n  Worker running. Start the ork in another terminal:')
  console.log('    node backend/core/examples/mdk-e2e/dht-ork.js\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
