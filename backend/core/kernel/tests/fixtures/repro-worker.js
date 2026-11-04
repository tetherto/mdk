'use strict'

// Repro fixture: a real worker process that finds its peer through the shared
// DHT topic alone, with no key handoff, and announces its RPC key over the
// swarm. Boots the real WorkerRuntime with the sim plugin — enough for the
// identity → capability → Ready flow the Kernel runs after key-exchange.
//
//   node repro-worker.js --topic <hex> --store <dir> [--bootstrap host:port,...]
//
// `--bootstrap` points the process at a private DHT. Omit it and the process
// joins hyperdht's public network, which needs outbound UDP.

const path = require('path')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const WorkerRuntime = require(path.join(__dirname, '..', '..', '..', 'mdk-worker', 'lib', 'worker-runtime'))
const simPlugin = require(path.join(__dirname, '..', '..', '..', 'mdk-worker', 'tests', 'fixtures', 'sim-plugin'))

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

  const store = new StoreFacility(null, { storeDir }, {})
  await new Promise((resolve, reject) => store.start((e) => (e ? reject(e) : resolve())))

  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'repro-worker-1',
    kernelTopic: topic,
    store,
    allowedKeys: [arg('--allow', null)].filter(Boolean),
    devices: [{ deviceId: 'd1', config: { hashrate: 1, power: 100 } }],
    ...(bootstrap ? { bootstrap } : {})
  })
  await runtime.start()

  process.once('SIGTERM', async () => {
    setTimeout(() => process.exit(0), 2000).unref()
    try { await runtime.stop() } catch {}
    process.exit(0)
  })

  // Readiness token consumed by the test.
  console.log('REPRO_WORKER_READY key=%s', runtime.getPublicKey().toString('hex'))
}

main().catch((err) => { console.error('REPRO_WORKER_ERR', err && err.message); process.exit(1) })
