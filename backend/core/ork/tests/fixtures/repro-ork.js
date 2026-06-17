'use strict'

// Repro fixture: a real ORK process that joins ONLY the shared DHT topic
// (no bootstrap) as a client and registers any worker it discovers. Boots the
// real OrkManager (HRPC gateway + DHTListener); polls its registry and prints a
// token the moment a worker reaches READY.
//
//   node repro-ork.js --topic <hex> --store <dir>

const { createORK } = require(require('path').join(__dirname, '..', '..'))

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main () {
  const topic = arg('--topic', null)
  const storeDir = arg('--store', null)
  if (!topic || !storeDir) throw new Error('ERR_REPRO_ARGS: --topic and --store required')

  const ork = createORK({
    db: storeDir,
    root: storeDir,
    gateways: { hrpc: {}, ipc: false },
    discovery: { topic }
  })
  await ork.init()
  await ork.start()

  console.log('REPRO_ORK_STARTED')

  const timer = setInterval(() => {
    const ready = ork.registry.listWorkers().filter((w) => w.state === 'READY' && (w.deviceIds || []).length > 0)
    if (ready.length > 0) {
      console.log('REPRO_ORK_REGISTERED workerId=%s', ready[0].workerId)
      clearInterval(timer)
    }
  }, 300)
  timer.unref()

  process.once('SIGTERM', async () => {
    setTimeout(() => process.exit(0), 2000).unref()
    try { await ork.stop() } catch {}
    process.exit(0)
  })
}

main().catch((err) => { console.error('REPRO_ORK_ERR', err && err.message); process.exit(1) })
