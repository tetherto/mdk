'use strict'

const { getOrk, waitForDiscovery } = require('../../mdk')

async function main () {
  const ork = await getOrk()

  console.log('\n  Waiting for worker via DHT...')

  const workers = await waitForDiscovery(ork, 30000)
  const ready = workers.filter(w => w.state === 'READY')

  if (ready.length === 0) {
    console.log('\n  No workers discovered. Is dht-worker.js running?\n')
    process.exit(1)
  }

  console.log('\n  ════════════════════════════════════════')
  console.log(`  HRPC key: ${ork.getPublicKey().toString('hex').slice(0, 32)}...`)
  console.log(`  Workers: ${ready.length}`)
  for (const w of ready) {
    console.log(`  ${w.workerId.padEnd(35)} ${w.deviceIds.length} devices`)
    for (const id of w.deviceIds) console.log(`    device: ${id}`)
  }
  console.log('  ════════════════════════════════════════')
  console.log('\n  Run the client in another terminal:')
  console.log('    node backend/core/examples/mdk-e2e/client.js\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
