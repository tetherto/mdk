'use strict'

// Repro fixture: a real Kernel process that finds its peer through the shared
// DHT topic alone, with no key handoff, and registers any worker it discovers.
// Boots the real KernelManager (HRPC listener + DHTListener); polls its registry
// and prints a token the moment a worker reaches READY.
//
//   node repro-kernel.js --topic <hex> --store <dir> [--bootstrap host:port,...]
//
// `--bootstrap` points the process at a private DHT. Omit it and the process
// joins hyperdht's public network, which needs outbound UDP.

const { createKernel } = require(require('path').join(__dirname, '..', '..'))

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function bootstrapArg () {
  const raw = arg('--bootstrap', null)
  if (!raw) return null
  return raw.split(',').filter(Boolean).map((entry) => {
    const i = entry.lastIndexOf(':')
    return { host: entry.slice(0, i), port: Number(entry.slice(i + 1)) }
  })
}

async function main () {
  const topic = arg('--topic', null)
  const storeDir = arg('--store', null)
  const bootstrap = bootstrapArg()
  if (!topic || !storeDir) throw new Error('ERR_REPRO_ARGS: --topic and --store required')

  const kernel = createKernel({
    db: storeDir,
    root: storeDir,
    listeners: { hrpc: bootstrap ? { bootstrap } : {} },
    // The worker process boots after this one, so its key is unknown here.
    // This repro covers discovery timing, not admission: admit any topic peer.
    discovery: { topic, allowAnyWorker: true }
  })
  await kernel.init()
  await kernel.start()

  // The worker process must allow this key (its firewall is fail-closed).
  console.log('REPRO_KERNEL_STARTED client=%s', kernel.getClientPublicKey().toString('hex'))

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
