'use strict'

/**
 * MDK E2E backend server.
 *
 * Always starts: ORK + mock Whatsminer M56S + MDK worker.
 * With --app-node: also starts app-node HTTP API on port 3000 (noAuth mode).
 *
 * Usage:
 *   node server.js              # ORK + mock miner + worker
 *   node server.js --app-node   # + app-node HTTP API on :3000
 */

const { getOrk, startWorker, startAppNode } = require('../../../backend/core/mdk')
const { WM_M56S } = require('../../../backend/workers/miners/whatsminer')
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')

const withAppNode = process.argv.includes('--app-node')

async function main () {
  wmMock.createServer({ port: 14028, host: '127.0.0.1', type: 'm56s', serial: 'WM-001', password: 'admin' })

  const ork = await getOrk()
  const { manager } = await startWorker(WM_M56S, { ork })

  await manager.registerThing({
    info: { serialNum: 'WM-001', container: 'site-1' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  })

  const deviceId = Object.keys(manager.mem.things)[0]
  const K = ork.getPublicKey().toString('hex')

  console.log(`\n  ORK key:  ${K}`)
  console.log(`  Device:   ${deviceId}`)
  console.log(`\n  hp-rpc-cli -s ${K} -m mdk -d '{"id":"1","version":"0.1.0","type":"request","action":"worker.list","sender":"cli","timestamp":${Date.now()},"payload":{}}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '{"id":"2","version":"0.1.0","type":"request","action":"telemetry.pull","sender":"cli","deviceId":"${deviceId}","timestamp":${Date.now()},"payload":{"query":{"type":"metrics"}}}'`)

  if (withAppNode) {
    await startAppNode({ ork, noAuth: true, port: 3000 })
    console.log('\n  App-node: http://localhost:3000 (noAuth mode)')
  }

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
