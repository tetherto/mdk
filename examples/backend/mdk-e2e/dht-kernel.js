'use strict'

const { getKernel, waitForDiscovery } = require('../../../backend/core/mdk')

async function main () {
  const kernel = await getKernel()

  console.log('\n  Waiting for worker via DHT...')

  const workers = await waitForDiscovery(kernel, 30000)
  const ready = workers.filter(w => w.state === 'READY')

  if (ready.length === 0) {
    console.log('\n  No workers discovered. Is dht-worker.js running?\n')
    process.exit(1)
  }

  console.log('\n  ════════════════════════════════════════')
  console.log(`  HRPC key: ${kernel.getPublicKey().toString('hex').slice(0, 32)}...`)
  console.log(`  Workers: ${ready.length}`)
  for (const w of ready) {
    console.log(`  ${w.workerId.padEnd(35)} ${w.deviceIds.length} devices`)
    for (const id of w.deviceIds) console.log(`    device: ${id}`)
  }
  console.log('  ════════════════════════════════════════')
  console.log('\n  Run the client in another terminal:')
  console.log('    node examples/backend/mdk-e2e/client.js\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
