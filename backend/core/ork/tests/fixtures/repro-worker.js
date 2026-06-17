'use strict'

// Repro fixture: a real worker process that joins ONLY the shared DHT topic
// (no bootstrap) and announces its RPC key over the swarm. Boots the real
// MDKWorkerAdapter with a minimal stub manager — enough for the
// identity → capability → Ready flow the ORK runs after key-exchange.
//
//   node repro-worker.js --topic <hex> --store <dir>

const path = require('path')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const { MDKWorkerAdapter } = require(path.join(__dirname, '..', '..', '..', '..', 'workers', 'base', 'lib', 'mdk-worker-adapter'))

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const contract = {
  metadata: { provider: 'repro', deviceFamily: 'miner', brand: 'Repro', modelsSupported: ['R1'], overview: 'repro' },
  capabilities: {
    telemetry: [{ name: 'hashrate', type: 'number', unit: 'TH/s', description: 'repro' }],
    commands: [{ name: 'reboot', params: [] }],
    health: { supportedStates: ['OK'] },
    errors: {}
  }
}

const manager = {
  mem: { things: { d1: { id: 'd1', type: 'repro' } } },
  listThings () { return [{ id: 'd1', type: 'repro' }] },
  async collectThingSnap () { return { hashrate: 1 } }
}

async function main () {
  const topic = arg('--topic', null)
  const storeDir = arg('--store', null)
  if (!topic || !storeDir) throw new Error('ERR_REPRO_ARGS: --topic and --store required')

  const store = new StoreFacility(null, { storeDir }, {})
  await new Promise((resolve, reject) => store.start((e) => (e ? reject(e) : resolve())))

  const adapter = new MDKWorkerAdapter(manager, contract, {
    workerId: 'repro-worker-1',
    orkTopic: topic,
    store
  })
  await adapter.start()

  process.once('SIGTERM', async () => {
    setTimeout(() => process.exit(0), 2000).unref()
    try { await adapter.stop() } catch {}
    process.exit(0)
  })

  // Readiness token consumed by the test.
  console.log('REPRO_WORKER_READY key=%s', adapter.getPublicKey().toString('hex'))
}

main().catch((err) => { console.error('REPRO_WORKER_ERR', err && err.message); process.exit(1) })
