'use strict'

const { setTimeout: sleep } = require('timers/promises')
const { getOrk, startWorker } = require('../../../backend/core/mdk')
const { SENECA } = require('../../../backend/workers/temperature/seneca')
const srv = require('../../../backend/workers/temperature/seneca/mock/server')

async function main () {
  srv.createServer({ host: '127.0.0.1', port: 5030, type: 'seneca' })
  await sleep(500)

  const ork = await getOrk()
  const { manager } = await startWorker(SENECA, { ork })

  await manager.registerThing({
    info: { serialNum: 'SEN-001' },
    opts: { address: '127.0.0.1', port: 5030, unitId: 0, register: 3 }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
