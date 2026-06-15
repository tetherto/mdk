'use strict'

// Antminer S21 runnable example.
// Mirror of run-s19xp.js. Starts a mock S21, brings up an ORK, registers one
// device, prints the IDs needed for manual inspection, and stays running.
//
// Usage:
//   node packages/workers/miners/antminer/examples/run-s21.js
//   (Ctrl+C to stop)

const { getOrk, startWorker } = require('../../../../core/mdk')
const { AM_S21 } = require('..')
const amMock = require('../mock/server')

async function main () {
  amMock.createServer({ port: 14023, host: '127.0.0.1', type: 's21', serial: 'AM-001', password: 'root' })

  const ork = await getOrk()
  const { manager } = await startWorker(AM_S21, { ork })

  await manager.registerThing({
    info: { container: 'site-1', serialNum: 'AM-001' },
    opts: { address: '127.0.0.1', port: 14023, username: 'root', password: 'root' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
