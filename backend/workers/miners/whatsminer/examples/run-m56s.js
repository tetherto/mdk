'use strict'

// Whatsminer M56S runnable example.
// Per-worker mirror of packages/core/examples/miners/mdk.client.miner.js, which
// also uses M56S. Starts a mock M56S, brings up an ORK, registers one device,
// prints the IDs needed for manual inspection, and stays running.
//
// Usage:
//   node packages/workers/miners/whatsminer/examples/run-m56s.js
//   (Ctrl+C to stop)

const { getOrk, startWorker } = require('../../../../core/mdk')
const { WM_M56S } = require('..')
const wmMock = require('../mock/server')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  const ork = await getOrk()
  const { manager } = await startWorker(WM_M56S, { ork })

  await manager.registerThing({
    info: { container: 'site-1', serialNum: 'WM-001' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
