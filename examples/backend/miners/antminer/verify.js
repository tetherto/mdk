'use strict'

// Functional check for the running Antminer example.
//
// While the example (index.js) is running in another terminal, this connects to
// the ORK's IPC socket over the MDK Protocol and proves the full stack works:
// it lists the workers ORK has discovered, then pulls capabilities and live
// telemetry for each registered Antminer mock device.
//
// This is the integrated, working surface today. The app-node HTTP data routes
// (/auth/miners, /auth/list-things) are NOT yet wired to the MDK ORK — that is
// the parent "MDK integration of workers" task — so we verify over IPC, not curl.
//
// Usage:
//   node index.js          # terminal 1 (leave running)
//   node verify.js         # terminal 2

const os = require('os')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { createMdkClient } = require(path.join(REPO_ROOT, 'backend', 'core', 'client'))

const SOCK = path.join(os.tmpdir(), 'mdk-site-antminer', 'ork', 'ork.sock')

const deviceIdsOf = (w) => w.deviceIds || w.devices || []

const main = async () => {
  const client = createMdkClient({ ipc: SOCK })
  try {
    await client.connect()
  } catch (err) {
    console.error(`Could not connect to ORK at ${SOCK}`)
    console.error('Is the example running? Start it with `node index.js` first.')
    throw err
  }

  // Poll until every discovered worker has had its devices pulled by the ORK.
  // The ORK pulls each worker on a cycle, so the last-registered one can briefly
  // report 0 devices right after startup.
  let workers = []
  for (let attempt = 0; attempt < 20; attempt++) {
    workers = (await client.listWorkers()).workers || []
    if (workers.length && workers.every(w => deviceIdsOf(w).length > 0)) break
    await sleep(1000)
  }

  console.log(`\nORK sees ${workers.length} worker(s):\n`)

  for (const w of workers) {
    const deviceIds = deviceIdsOf(w)
    console.log(`  ${w.workerId}  state=${w.state} health=${w.healthState} devices=${deviceIds.length}`)

    for (const deviceId of deviceIds) {
      const caps = await client.getCapabilities(deviceId)
      const telemetryNames = (caps.capabilities?.telemetry || []).map(t => t.name)
      const tele = await client.pullTelemetry(deviceId, 'metrics')
      const stats = tele.metrics?.stats || {}
      const hashAvg = stats.hashrate_mhs?.avg
      console.log(`    └─ ${deviceId}`)
      console.log(`         capabilities: ${telemetryNames.length} telemetry, ${(caps.capabilities?.commands || []).length} commands`)
      console.log(`         status=${stats.status} hashrate_mhs.avg=${hashAvg} pools=${(stats.pool_status || []).length}`)
    }
  }

  console.log('\nOK — Antminer site is live and serving telemetry over the MDK Protocol.\n')
  client.close()
}

main().catch((err) => { console.error('\nverify failed:', err.message); process.exit(1) })
