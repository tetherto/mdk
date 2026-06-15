'use strict'

const { getOrk, startWorker } = require('../../mdk')
const { WM_M56S } = require('../../../workers/miners/whatsminer')
const wmMock = require('../../../workers/miners/whatsminer/mock/server')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  const ork = await getOrk()
  const { manager } = await startWorker(WM_M56S, { ork })

  await manager.registerThing({
    info: { container: 'site-1', serialNum: 'WM001' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]

  console.log('\n  ORK HRPC key:', ork.getPublicKey().toString('hex'))
  console.log('  Device:', deviceId)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
