'use strict'

// Antminer S19XP runnable example.
// Mirror of backend/core/examples/miners/mdk.client.miner.js (which uses
// Whatsminer M56S). Starts a mock S19XP, brings up an ORK, registers one
// device, prints the IDs needed for manual inspection, and stays running.
//
// Usage:
//   node backend/workers/miners/antminer/examples/run-s19xp.js
//   (Ctrl+C to stop)

const { getOrk, startWorker } = require('../../../../core/mdk')
const { AM_S19XP } = require('..')
const amMock = require('../mock/server')

async function main () {
  amMock.createServer({ port: 14021, host: '127.0.0.1', type: 's19xp', serial: 'AM-001', password: 'root' })

  const ork = await getOrk()
  const { manager } = await startWorker(AM_S19XP, { ork })

  await manager.registerThing({
    info: { container: 'site-1', serialNum: 'AM-001' },
    opts: { address: '127.0.0.1', port: 14021, username: 'root', password: 'root' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
