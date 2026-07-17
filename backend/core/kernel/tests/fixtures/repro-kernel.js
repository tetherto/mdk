'use strict'

// Repro fixture: a real Kernel process that joins ONLY the shared DHT topic
// (no bootstrap) as a client and registers any worker it discovers. Boots the
// real KernelManager (HRPC listener + DHTListener); polls its registry and prints a
// token the moment a worker reaches READY.
//
//   node repro-kernel.js --topic <hex> --store <dir>

const { createKernel } = require(require('path').join(__dirname, '..', '..'))

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main () {
  const topic = arg('--topic', null)
  const storeDir = arg('--store', null)
  if (!topic || !storeDir) throw new Error('ERR_REPRO_ARGS: --topic and --store required')

  const kernel = createKernel({
    db: storeDir,
    root: storeDir,
    listeners: { hrpc: {} },
    discovery: { topic }
  })
  await kernel.init()
  await kernel.start()

  console.log('REPRO_KERNEL_STARTED')

  const timer = setInterval(() => {
    const ready = kernel.registry.listWorkers().filter((w) => w.state === 'READY' && (w.deviceIds || []).length > 0)
    if (ready.length > 0) {
      console.log('REPRO_KERNEL_REGISTERED workerId=%s', ready[0].workerId)
      clearInterval(timer)
    }
  }, 300)
  timer.unref()

  process.once('SIGTERM', async () => {
    setTimeout(() => process.exit(0), 2000).unref()
    try { await kernel.stop() } catch {}
    process.exit(0)
  })
}

main().catch((err) => { console.error('REPRO_KERNEL_ERR', err && err.message); process.exit(1) })
