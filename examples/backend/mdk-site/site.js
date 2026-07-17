'use strict'

const path = require('path')
const os = require('os')
const { setTimeout: sleep } = require('timers/promises')
const { getKernel } = require('../../../backend/core/mdk')

// Every family boots on the WorkerRuntime through its package's plugin boot.
const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const { startAntminerWorker } = require('../../../backend/workers/miners/antminer')
const { startAntspaceWorker } = require('../../../backend/workers/containers/antspace')
const { startAbbWorker } = require('../../../backend/workers/power-meter/abb')
const { startSenecaWorker } = require('../../../backend/workers/temperature/seneca')

// Mock hardware servers
const wmMock = require('../../../backend/workers/miners/whatsminer/mock/server')
const amMock = require('../../../backend/workers/miners/antminer/mock/server')
const asMock = require('../../../backend/workers/containers/antspace/mock/server')
const abbMock = require('../../../backend/workers/power-meter/abb/mock/server')
const senMock = require('../../../backend/workers/temperature/seneca/mock/server')

const SITE = 'site-texas-01'
const STORE_BASE = path.join(os.tmpdir(), 'mdk-site-example')

function storeDir (workerId) {
  return path.join(STORE_BASE, workerId, 'store')
}

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

  // Start Kernel first — workers will auto-register on the same topic
  console.log('\n  Starting Kernel...')
  const kernel = await getKernel()

  // ── Start Workers ──────────────────────────────────────────────
  // Each mock fleet shares 127.0.0.1, so duplicate addresses are allowed.

  // Whatsminer worker (manages 10 M56S miners in container-A)
  const wm = await startWhatsminerWorker({
    workerId: 'whatsminer-m56s-site',
    model: 'm56s',
    storeDir: storeDir('whatsminer-worker'),
    conf: { thing: { allowDuplicateIPs: true } },
    seedDevices: Array.from({ length: 10 }, (_, i) => ({
      id: `wm-${i + 1}`,
      info: {
        serialNum: `WM56S-${String(i + 1).padStart(3, '0')}`,
        container: 'container-A',
        pos: `A${i + 1}`,
        location: `${SITE}.container`
      },
      opts: { address: '127.0.0.1', port: 14100 + i, password: 'admin' }
    }))
  })
  await kernel.registerWorker(wm.runtime.getPublicKey())
  console.log('  Whatsminer worker: 10 M56S miners registered in container-A')

  // Antminer worker (manages 10 S19XP miners in container-B)
  const am = await startAntminerWorker({
    workerId: 'antminer-s19xp-site',
    model: 's19xp',
    storeDir: storeDir('antminer-worker'),
    conf: { thing: { allowDuplicateIPs: true } },
    seedDevices: Array.from({ length: 10 }, (_, i) => ({
      info: {
        serialNum: `S19XP-${String(i + 1).padStart(3, '0')}`,
        container: 'container-B',
        pos: `B${i + 1}`,
        location: `${SITE}.container`
      },
      opts: { address: '127.0.0.1', port: 14200 + i, username: 'root', password: 'root' }
    }))
  })
  await kernel.registerWorker(am.runtime.getPublicKey())
  console.log('  Antminer worker: 10 S19XP miners registered in container-B')

  // Container worker (manages 2 Antspace HK3 containers)
  const as = await startAntspaceWorker({
    workerId: 'antspace-hk3-site',
    model: 'hk3',
    storeDir: storeDir('antspace-worker'),
    conf: { thing: { allowDuplicateIPs: true } },
    seedDevices: [
      {
        info: { serialNum: 'HK3-A', container: 'container-A', location: `${SITE}.container` },
        opts: { address: '127.0.0.1', port: 18001 }
      },
      {
        info: { serialNum: 'HK3-B', container: 'container-B', location: `${SITE}.container` },
        opts: { address: '127.0.0.1', port: 18002 }
      }
    ]
  })
  await kernel.registerWorker(as.runtime.getPublicKey())
  console.log('  Container worker: 2 Antspace HK3 containers registered')

  // Power meter worker (1 ABB B23 per container)
  const abb = await startAbbWorker({
    workerId: 'abb-b23-site',
    model: 'b23',
    storeDir: storeDir('powermeter-worker'),
    conf: { thing: { allowDuplicateIPs: true } },
    seedDevices: [
      {
        info: { serialNum: 'ABB-A', container: 'container-A', location: `${SITE}.container` },
        opts: { address: '127.0.0.1', port: 15001, unitId: 0 }
      },
      {
        info: { serialNum: 'ABB-B', container: 'container-B', location: `${SITE}.container` },
        opts: { address: '127.0.0.1', port: 15002, unitId: 0 }
      }
    ]
  })
  await kernel.registerWorker(abb.runtime.getPublicKey())
  console.log('  Power meter worker: 2 ABB B23 meters registered')

  // Temperature sensor worker (1 sensor per container)
  const sen = await startSenecaWorker({
    workerId: 'seneca-site',
    storeDir: storeDir('sensor-worker'),
    conf: { thing: { allowDuplicateIPs: true } },
    seedDevices: [
      {
        info: { serialNum: 'SEN-A', container: 'container-A', pos: 'lv_1', location: `${SITE}.container` },
        opts: { address: '127.0.0.1', port: 15501, unitId: 0, register: 3 }
      },
      {
        info: { serialNum: 'SEN-B', container: 'container-B', pos: 'lv_1', location: `${SITE}.container` },
        opts: { address: '127.0.0.1', port: 15502, unitId: 0, register: 3 }
      }
    ]
  })
  await kernel.registerWorker(sen.runtime.getPublicKey())
  console.log('  Sensor worker: 2 Seneca temperature sensors registered')

  // Wait for all 5 workers to be discovered and devices populated
  let attempts = 0
  while (attempts < 120) {
    const w = kernel.registry.listWorkers()
    const ready = w.filter(wr => wr.state === 'READY')
    const totalDev = ready.reduce((sum, wr) => sum + wr.deviceIds.length, 0)
    if (ready.length >= 5 && totalDev >= 26) break
    await sleep(500)
    attempts++
  }

  const workers = kernel.registry.listWorkers()
  const totalDevices = workers.reduce((sum, w) => sum + w.deviceIds.length, 0)

  console.log('')
  console.log('  ════════════════════════════════════════════════════')
  console.log(`  Site: ${SITE}`)
  console.log(`  HRPC Key: ${kernel.getPublicKey().toString('hex')}`)
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
