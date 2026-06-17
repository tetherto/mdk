'use strict'

const { setTimeout: sleep } = require('timers/promises')
const { getOrk, startWorker } = require('../../../backend/core/mdk')

// Miner types
const { WM_M56S } = require('../../../backend/workers/miners/whatsminer')
const { AM_S19XP } = require('../../../backend/workers/miners/antminer')

// Container type
const { AS_HK3 } = require('../../../backend/workers/containers/antspace')

// Power meter
const { ABB_B23 } = require('../../../backend/workers/power-meter/abb')

// Temperature sensor
const { SENECA } = require('../../../backend/workers/temperature/seneca')

// Mock hardware servers
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')
const amMock = require('../../../backend/workers/miners/antminer/mock/server')
const asMock = require('../../../backend/workers/containers/antspace/mock/server')
const abbMock = require('../../../backend/workers/power-meter/abb/mock/server')
const senMock = require('../../../backend/workers/temperature/seneca/mock/server')

const SITE = 'site-texas-01'

async function startMocks () {
  // Whatsminer mock fleet: ports 14100-14109
  for (let i = 0; i < 10; i++) {
    wmMock.createServer({ port: 14100 + i, host: '127.0.0.1', type: 'm56s', serial: `WM-${i}`, password: 'admin' })
  }

  // Antminer mock fleet: ports 14200-14209
  for (let i = 0; i < 10; i++) {
    amMock.createServer({ port: 14200 + i, host: '127.0.0.1', type: 's19xp' })
  }

  // Container mocks: ports 18001-18002
  asMock.createServer({ port: 18001, host: '127.0.0.1', type: 'hk3' })
  asMock.createServer({ port: 18002, host: '127.0.0.1', type: 'hk3' })

  // Power meter mocks: ports 15001-15002
  abbMock.createServer({ host: '127.0.0.1', port: 15001, type: 'B23' })
  abbMock.createServer({ host: '127.0.0.1', port: 15002, type: 'B23' })

  // Temperature sensor mocks: ports 15501-15502
  senMock.createServer({ host: '127.0.0.1', port: 15501, type: 'seneca' })
  senMock.createServer({ host: '127.0.0.1', port: 15502, type: 'seneca' })

  await sleep(1000)
}

async function main () {
  console.log(`\n  Setting up MDK site: ${SITE}\n`)

  await startMocks()
  console.log('  Mock hardware started (20 miners, 2 containers, 2 power meters, 2 temp sensors)')

  // Start ORK first — workers will auto-register on the same topic
  console.log('\n  Starting ORK...')
  const ork = await getOrk()

  // ── Start Workers ──────────────────────────────────────────────

  // Whatsminer worker (manages 10 M56S miners in container-A)
  const { manager: wm } = await startWorker(WM_M56S, { ork })

  for (let i = 0; i < 10; i++) {
    await wm.registerThing({
      info: {
        serialNum: `WM56S-${String(i + 1).padStart(3, '0')}`,
        container: 'container-A',
        pos: `A${i + 1}`,
        location: `${SITE}.container`
      },
      opts: { address: '127.0.0.1', port: 14100 + i, password: 'admin' }
    })
  }
  console.log('  Whatsminer worker: 10 M56S miners registered in container-A')

  // Antminer worker (manages 10 S19XP miners in container-B)
  const { manager: am } = await startWorker(AM_S19XP, { ork })

  for (let i = 0; i < 10; i++) {
    await am.registerThing({
      info: {
        serialNum: `S19XP-${String(i + 1).padStart(3, '0')}`,
        container: 'container-B',
        pos: `B${i + 1}`,
        location: `${SITE}.container`
      },
      opts: { address: '127.0.0.1', port: 14200 + i }
    })
  }
  console.log('  Antminer worker: 10 S19XP miners registered in container-B')

  // Container worker (manages 2 Antspace HK3 containers)
  const { manager: as } = await startWorker(AS_HK3, { ork })

  await as.registerThing({
    info: { serialNum: 'HK3-A', container: 'container-A', location: `${SITE}.container` },
    opts: { address: '127.0.0.1', port: 18001 }
  })
  await as.registerThing({
    info: { serialNum: 'HK3-B', container: 'container-B', location: `${SITE}.container` },
    opts: { address: '127.0.0.1', port: 18002 }
  })
  console.log('  Container worker: 2 Antspace HK3 containers registered')

  // Power meter worker (1 ABB B23 per container)
  const { manager: abb } = await startWorker(ABB_B23, { ork })

  await abb.registerThing({
    info: { serialNum: 'ABB-A', container: 'container-A', location: `${SITE}.container` },
    opts: { address: '127.0.0.1', port: 15001, unitId: 0 }
  })
  await abb.registerThing({
    info: { serialNum: 'ABB-B', container: 'container-B', location: `${SITE}.container` },
    opts: { address: '127.0.0.1', port: 15002, unitId: 0 }
  })
  console.log('  Power meter worker: 2 ABB B23 meters registered')

  // Temperature sensor worker (1 sensor per container)
  const { manager: sen } = await startWorker(SENECA, { ork })

  await sen.registerThing({
    info: { serialNum: 'SEN-A', container: 'container-A', pos: 'lv_1', location: `${SITE}.container` },
    opts: { address: '127.0.0.1', port: 15501, unitId: 0, register: 3 }
  })
  await sen.registerThing({
    info: { serialNum: 'SEN-B', container: 'container-B', pos: 'lv_1', location: `${SITE}.container` },
    opts: { address: '127.0.0.1', port: 15502, unitId: 0, register: 3 }
  })
  console.log('  Sensor worker: 2 Seneca temperature sensors registered')

  // Wait for all 5 workers to be discovered and devices populated
  let attempts = 0
  while (attempts < 120) {
    const w = ork.registry.listWorkers()
    const ready = w.filter(wr => wr.state === 'READY')
    const totalDev = ready.reduce((sum, wr) => sum + wr.deviceIds.length, 0)
    if (ready.length >= 5 && totalDev >= 26) break
    await sleep(500)
    attempts++
  }

  const workers = ork.registry.listWorkers()
  const totalDevices = workers.reduce((sum, w) => sum + w.deviceIds.length, 0)

  console.log('')
  console.log('  ════════════════════════════════════════════════════')
  console.log(`  Site: ${SITE}`)
  console.log(`  HRPC Key: ${ork.getPublicKey().toString('hex')}`)
  console.log(`  Workers: ${workers.length} | Devices: ${totalDevices}`)
  console.log('  ════════════════════════════════════════════════════')

  for (const w of workers) {
    console.log(`  ${w.workerId.padEnd(35)} ${w.state.padEnd(8)} ${w.deviceIds.length} devices`)
  }

  console.log('')
  console.log('  Topology:')
  console.log('  ┌─ container-A (Antspace HK3)')
  console.log('  │  ├─ 10x Whatsminer M56S (pos A1-A10)')
  console.log('  │  ├─ 1x ABB B23 power meter')
  console.log('  │  └─ 1x Seneca temperature sensor')
  console.log('  │')
  console.log('  └─ container-B (Antspace HK3)')
  console.log('     ├─ 10x Antminer S19XP (pos B1-B10)')
  console.log('     ├─ 1x ABB B23 power meter')
  console.log('     └─ 1x Seneca temperature sensor')
  console.log('')
  console.log('  Ctrl+C to stop.')
  console.log('')
}

main().catch((err) => { console.error('Site setup failed:', err); process.exit(1) })
