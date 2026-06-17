'use strict'

// Functional check for the running MicroBT container example.
//
// While the example (index.js) is running in another terminal, this hits the
// HTTP API exposed by the app node and proves the full stack works: it lists
// the workers ORK has discovered, then pulls live telemetry for each registered
// MicroBT mock container.
//
// Usage:
//   node index.js          # terminal 1 (leave running)
//   node verify.js         # terminal 2

const { setTimeout: sleep } = require('timers/promises')

const BASE = 'http://localhost:3000'

const get = async (path) => {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`)
  return res.json()
}

const deviceIdsOf = (w) => w.deviceIds || w.devices || []

const main = async () => {
  // Poll until every discovered worker has had its devices pulled by the ORK.
  // The ORK pulls each worker on a cycle, so the last-registered one can briefly
  // report 0 devices right after startup.
  let workers = []
  for (let attempt = 0; attempt < 20; attempt++) {
    let data
    try {
      data = await get('/site-monitor/workers')
    } catch (err) {
      if (attempt === 0) {
        console.error(`Could not reach ${BASE}`)
        console.error('Is the example running? Start it with `node index.js` first.')
      }
      await sleep(1000)
      continue
    }
    workers = data.workers || []
    if (workers.length && workers.every(w => deviceIdsOf(w).length > 0)) break
    await sleep(1000)
  }

  console.log(`\nORK sees ${workers.length} worker(s):\n`)

  for (const w of workers) {
    const deviceIds = deviceIdsOf(w)
    console.log(`  ${w.workerId}  state=${w.state} health=${w.healthState} devices=${deviceIds.length}`)

    for (const deviceId of deviceIds) {
      const tele = await get(`/site-monitor/devices/${deviceId}/telemetry`)
      const stats = tele.metrics?.stats || {}
      const power = stats.power_w ?? 'n/a'
      console.log(`    └─ ${deviceId}`)
      console.log(`         power_w=${power}`)
    }
  }

  console.log('\nOK — MicroBT container site is live and serving telemetry over HTTP.\n')
}

main().catch((err) => { console.error('\nverify failed:', err.message); process.exit(1) })
