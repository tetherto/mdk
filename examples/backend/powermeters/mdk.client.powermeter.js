'use strict'

const { setTimeout: sleep } = require('timers/promises')
const { getOrk, startWorker } = require('../../../backend/core/mdk')
const { ABB_B23 } = require('../../../backend/workers/power-meter/abb')
const srv = require('../../../backend/workers/power-meter/abb/mock/server')

async function main () {
  srv.createServer({ host: '127.0.0.1', port: 5020, type: 'B23' })
  await sleep(500)

  const ork = await getOrk()
  const { manager } = await startWorker(ABB_B23, { ork })

  await manager.registerThing({
    info: { serialNum: 'B23-1' },
    opts: { address: '127.0.0.1', port: 5020, unitId: 0 }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
