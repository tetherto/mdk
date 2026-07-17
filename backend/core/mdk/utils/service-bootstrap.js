'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')

function findRepoRoot (startDir) {
  let dir = startDir
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'backend', 'core', 'mdk'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('ERR_MDK_REPO_ROOT: could not locate repository root')
}

function ensureConfigFromExamples (dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      ensureConfigFromExamples(full)
      continue
    }
    if (!entry.name.endsWith('.example')) continue
    const dest = path.join(dir, entry.name.slice(0, -'.example'.length))
    if (!fs.existsSync(dest)) fs.copyFileSync(full, dest)
  }
}

// Every worker family boots through its package's runtime plugin boot.
// TYPE (env) maps onto the boot's model id; workerId is
// `<prefix>-<model>-<rack>` so persistent stores and RPC seeds are stable
// per rack. Pool workers take no model — one logical pool per rack.
const WORKER_BOOTS = {
  'miner-whatsminer': {
    pkg: 'workers/miners/whatsminer',
    factory: 'startWhatsminerWorker',
    prefix: 'whatsminer',
    models: { M30SP: 'm30sp', M30SPP: 'm30spp', M53S: 'm53s', M56S: 'm56s', M63: 'm63' }
  },
  'miner-antminer': {
    pkg: 'workers/miners/antminer',
    factory: 'startAntminerWorker',
    prefix: 'antminer',
    models: { S19XP: 's19xp', S19XPH: 's19xp_h', S21: 's21', S21PRO: 's21pro' }
  },
  'miner-avalon': {
    pkg: 'workers/miners/avalon',
    factory: 'startAvalonWorker',
    prefix: 'avalon',
    models: { A1346: 'a1346' }
  },
  'container-antspace': {
    pkg: 'workers/containers/antspace',
    factory: 'startAntspaceWorker',
    prefix: 'antspace',
    models: { HK3: 'hk3', IMMERSION: 'immersion' }
  },
  'container-bitdeer': {
    pkg: 'workers/containers/bitdeer',
    factory: 'startBitdeerWorker',
    prefix: 'bitdeer',
    models: { D40_A1346: 'a1346', D40_M30: 'm30', D40_M56: 'm56', D40_S19XP: 's19xp' }
  },
  'powermeter-abb': {
    pkg: 'workers/power-meter/abb',
    factory: 'startAbbWorker',
    prefix: 'abb',
    models: { B23: 'b23', B24: 'b24', M1M20: 'm1m20', M4M20: 'm4m20', REU615: 'reu615' }
  },
  'powermeter-satec': {
    pkg: 'workers/power-meter/satec',
    factory: 'startSatecWorker',
    prefix: 'satec',
    models: { PM180: 'pm180' }
  },
  'powermeter-schneider': {
    pkg: 'workers/power-meter/schneider',
    factory: 'startSchneiderWorker',
    prefix: 'schneider',
    models: { P3U30: 'p3u30', PM5340: 'pm5340' }
  },
  'sensor-seneca': {
    pkg: 'workers/temperature/seneca',
    factory: 'startSenecaWorker',
    prefix: 'seneca',
    models: { 'Z-4RTD-2': 'z-4rtd-2' },
    noModelOpt: true
  },
  'minerpool-ocean': {
    pkg: 'workers/minerpools/ocean',
    factory: 'startOceanPoolWorker',
    prefix: 'ocean',
    pool: true
  },
  'minerpool-f2pool': {
    pkg: 'workers/minerpools/f2pool',
    factory: 'startF2poolWorker',
    prefix: 'f2pool',
    pool: true
  }
}

function resolveWorkerBoot (repoRoot, worker) {
  const spec = WORKER_BOOTS[worker]
  if (!spec) {
    throw new Error(`ERR_MDK_WORKER_UNKNOWN: no runtime boot for "${worker}"`)
  }
  const mod = require(path.join(repoRoot, 'backend', spec.pkg))
  const factory = mod[spec.factory]
  if (!factory) {
    throw new Error(`ERR_MDK_WORKER_EXPORT: ${spec.factory} not found in ${worker}`)
  }
  return { spec, factory }
}

function requireMdk (repoRoot) {
  return require(path.join(repoRoot, 'backend', 'core', 'mdk'))
}

// Same topic-file rendezvous as getKernel's standalone DHT mode (a worker may
// boot before the kernel and writes the topic file a later getKernel() picks
// up).
function resolveKernelTopic (repoRoot) {
  const { DEFAULT_TOPIC_FILE } = requireMdk(repoRoot)
  if (fs.existsSync(DEFAULT_TOPIC_FILE)) {
    return fs.readFileSync(DEFAULT_TOPIC_FILE, 'utf8').trim()
  }
  const kernelTopic = crypto.randomBytes(32).toString('hex')
  fs.mkdirSync(path.dirname(DEFAULT_TOPIC_FILE), { recursive: true })
  fs.writeFileSync(DEFAULT_TOPIC_FILE, kernelTopic, 'utf8')
  return kernelTopic
}

async function runWorker (repoRoot) {
  const { initialize } = requireMdk(repoRoot)
  const worker = process.env.WORKER
  const type = process.env.TYPE
  const rack = process.env.RACK

  if (!worker || !rack) {
    throw new Error('ERR_MDK_WORKER_ENV: WORKER and RACK are required')
  }

  initialize()

  const root = process.env.MDK_WORKER_ROOT ||
    path.join(process.cwd(), 'data', rack)
  const kernelTopic = resolveKernelTopic(repoRoot)

  const { spec, factory } = resolveWorkerBoot(repoRoot, worker)

  if (spec.pool) {
    const workerId = `${spec.prefix}-${rack}`
    const storeDir = path.join(root, 'workers', workerId, 'store')
    fs.mkdirSync(storeDir, { recursive: true })
    return factory({ workerId, rack, storeDir, root, kernelTopic })
  }

  if (!type) {
    throw new Error('ERR_MDK_WORKER_ENV: TYPE is required')
  }
  const model = spec.models[type]
  if (!model) {
    throw new Error(`ERR_MDK_WORKER_UNKNOWN: no plugin model for ${worker}:${type}`)
  }

  const workerId = `${spec.prefix}-${model}-${rack}`
  const storeDir = path.join(root, 'workers', workerId, 'store')
  fs.mkdirSync(storeDir, { recursive: true })

  const opts = { workerId, storeDir, kernelTopic }
  if (!spec.noModelOpt) opts.model = model
  return factory(opts)
}

function runGateway (repoRoot) {
  const gatewayRoot = path.join(repoRoot, 'backend', 'core', 'gateway')
  ensureConfigFromExamples(path.join(gatewayRoot, 'config'))

  const env = process.env.MDK_ENV || 'development'
  const port = process.env.PORT || '3000'
  const workerPath = path.join(gatewayRoot, 'worker.js')

  // Spawn so bfx-svc-boot-js uses gateway as serviceRoot (require.main.filename).
  const child = spawn(process.execPath, [
    workerPath,
    '--wtype', 'wrk-node-http',
    '--env', env,
    '--port', String(port)
  ], {
    cwd: gatewayRoot,
    stdio: 'inherit',
    env: process.env
  })

  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) return resolve()
      reject(new Error(
        `gateway exited with code ${code}${signal ? ` (${signal})` : ''}`
      ))
    })
  })
}

async function main () {
  const repoRoot = findRepoRoot(__dirname)
  const service = process.env.SERVICE

  if (!service) {
    throw new Error('ERR_MDK_SERVICE_ENV: SERVICE env var is required (gateway | worker)')
  }

  if (service === 'gateway') {
    return runGateway(repoRoot)
  }

  if (service === 'worker') {
    return runWorker(repoRoot)
  }

  throw new Error(`ERR_MDK_SERVICE_UNKNOWN: "${service}"`)
}

module.exports = {
  findRepoRoot,
  ensureConfigFromExamples,
  WORKER_BOOTS,
  resolveWorkerBoot,
  runGateway,
  runWorker,
  main
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
