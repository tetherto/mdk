'use strict'

// Avalon A1346 runnable example.
// Mirror of packages/workers/miners/antminer/examples/run-s19xp.js. Starts a
// mock A1346, brings up an ORK, registers one device, prints the IDs needed for
// manual inspection, and stays running.
//
// Usage:
//   node packages/workers/miners/avalon/examples/run-a1346.js
//   (Ctrl+C to stop)

const { getOrk, startWorker } = require('../../../../core/mdk')
const { AV_A1346 } = require('..')
const avMock = require('../mock/server')

async function main () {
  avMock.createServer({ port: 14030, host: '127.0.0.1', type: 'a1346', serial: 'AV-001' })

  const ork = await getOrk()
  const { manager } = await startWorker(AV_A1346, { ork })

  await manager.registerThing({
    info: { container: 'site-1', serialNum: 'AV-001' },
    opts: { address: '127.0.0.1', port: 14030 }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
