'use strict'

// Whatsminer M63 runnable example.
// Mirror of packages/core/examples/miners/mdk.client.miner.js (M56S). Starts a
// mock M63, brings up an ORK, registers one device, prints the IDs needed for
// manual inspection, and stays running.
//
// Usage:
//   node packages/workers/miners/whatsminer/examples/run-m63.js
//   (Ctrl+C to stop)

const { getOrk, startWorker } = require('../../../../core/mdk')
const { WM_M63 } = require('..')
const wmMock = require('../mock/server')

async function main () {
  wmMock.createServer({ port: 14029, host: '127.0.0.1', type: 'm63', serial: 'WM-001', password: 'admin' })

  const ork = await getOrk()
  const { manager } = await startWorker(WM_M63, { ork })

  await manager.registerThing({
    info: { container: 'site-1', serialNum: 'WM-001' },
    opts: { address: '127.0.0.1', port: 14029, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
