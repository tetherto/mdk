'use strict'

const { setTimeout: sleep } = require('timers/promises')
const { getOrk, startWorker } = require('../../mdk')
const { AS_HK3 } = require('../../../workers/containers/antspace')
const mock = require('../utils/mock')
const srv = require('../../../workers/containers/antspace/mock/server')

async function main () {
  await mock.run(srv, '127.0.0.1', 8000, 'hk3')
  await sleep(500)

  const ork = await getOrk()
  const { manager } = await startWorker(AS_HK3, { ork })

  await manager.registerThing({
    info: { container: 'hk-1', serialNum: 'AS001' },
    opts: { address: '127.0.0.1', port: 8000 }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
