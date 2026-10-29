'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')

// Code is never located by walking up the directory tree: MDK packages are
// resolved by name (node_modules), and the one thing that still needs the
// source checkout — seeding config from its example files — takes it from
// MDK_REPO_ROOT, which startServices writes into the generated PM2/compose
// config.
function resolveRepoRoot (env = process.env) {
  const root = env.MDK_REPO_ROOT
  if (typeof root !== 'string' || !root.trim()) {
    throw new Error('ERR_MDK_REPO_ROOT_REQUIRED: set MDK_REPO_ROOT to the MDK source checkout (startServices({ repoRoot }) writes it into the generated PM2/compose config)')
  }
  return path.resolve(root)
}

function gatewayPackageDir () {
  return path.dirname(require.resolve('@tetherto/mdk-gateway/package.json'))
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

// Every worker family boots through its package's runtime plugin boot,
// resolved by package name.
// TYPE (env) maps onto the boot's model id; workerId is
// `<prefix>-<model>-<rack>` so persistent stores and RPC seeds are stable
// per rack. Pool workers take no model — one logical pool per rack.
const WORKER_BOOTS = {
  'miner-avalon': {
    pkg: '@tetherto/mdk-worker-avalon',
    factory: 'startAvalonWorker',
    prefix: 'avalon',
    models: { A1346: 'a1346' }
  },
  'container-antspace': {
    pkg: '@tetherto/mdk-worker-antspace',
    factory: 'startAntspaceWorker',
    prefix: 'antspace',
    models: { HK3: 'hk3', IMMERSION: 'immersion' }
  },
  'container-bitdeer': {
    pkg: '@tetherto/mdk-worker-bitdeer',
    factory: 'startBitdeerWorker',
    prefix: 'bitdeer',
    models: { D40_A1346: 'a1346', D40_M30: 'm30', D40_M56: 'm56', D40_S19XP: 's19xp' }
  },
  'powermeter-abb': {
    pkg: '@tetherto/mdk-worker-abb',
    factory: 'startAbbWorker',
    prefix: 'abb',
    models: { B23: 'b23', B24: 'b24', M1M20: 'm1m20', M4M20: 'm4m20', REU615: 'reu615' }
  },
  'powermeter-satec': {
    pkg: '@tetherto/mdk-worker-satec',
    factory: 'startSatecWorker',
    prefix: 'satec',
    models: { PM180: 'pm180' }
  },
  'powermeter-schneider': {
    pkg: '@tetherto/mdk-worker-schneider',
    factory: 'startSchneiderWorker',
    prefix: 'schneider',
    models: { P3U30: 'p3u30', PM5340: 'pm5340' }
  },
  'sensor-seneca': {
    pkg: '@tetherto/mdk-worker-seneca',
    factory: 'startSenecaWorker',
    prefix: 'seneca',
    models: { 'Z-4RTD-2': 'z-4rtd-2' },
    noModelOpt: true
  },
  'minerpool-f2pool': {
    pkg: '@tetherto/mdk-worker-f2pool',
    factory: 'startF2poolWorker',
    prefix: 'f2pool',
    pool: true
  }
}

// `load` is the module loader (require by default; tests inject a fake).
function resolveWorkerBoot (worker, load = require) {
  const spec = Object.hasOwn(WORKER_BOOTS, worker) ? WORKER_BOOTS[worker] : null
  if (!spec) {
    throw new Error(`ERR_MDK_WORKER_UNKNOWN: no runtime boot for "${worker}"`)
  }
  const mod = load(spec.pkg)
  const factory = mod[spec.factory]
  if (!factory) {
    throw new Error(`ERR_MDK_WORKER_EXPORT: ${spec.factory} not found in ${worker}`)
  }
  return { spec, factory }
}

function requireMdk () {
  return require('@tetherto/mdk-core')
}

// Same topic-file rendezvous as getKernel's standalone DHT mode (a worker may
// boot before the kernel and writes the topic file a later getKernel() picks
// up).
function resolveKernelTopic () {
  const { DEFAULT_TOPIC_FILE } = requireMdk()
  if (fs.existsSync(DEFAULT_TOPIC_FILE)) {
    return fs.readFileSync(DEFAULT_TOPIC_FILE, 'utf8').trim()
  }
  const kernelTopic = crypto.randomBytes(32).toString('hex')
  fs.mkdirSync(path.dirname(DEFAULT_TOPIC_FILE), { recursive: true })
  fs.writeFileSync(DEFAULT_TOPIC_FILE, kernelTopic, 'utf8')
  return kernelTopic
}

// Worker RPC is fail-closed. A standalone worker admits the Kernel's client
// key from the default trusted-keys dir plus any MDK_WORKER_ALLOWED_KEYS
// (comma-separated hex); MDK_WORKER_ALLOW_ALL=1 is the explicit development
// opt-out.
function resolveWorkerTrust (env = process.env) {
  const { DEFAULT_TRUSTED_KEYS_DIR } = requireMdk()
  const { readTrustedKeys, KERNEL_KEY_NAME } = require('@tetherto/mdk-core/lib/local-discovery')
  const allowAll = env.MDK_WORKER_ALLOW_ALL === '1' || env.MDK_WORKER_ALLOW_ALL === 'true'
  const allowedKeys = [
    ...(env.MDK_WORKER_ALLOWED_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean),
    ...readTrustedKeys(DEFAULT_TRUSTED_KEYS_DIR).filter((k) => k.name === KERNEL_KEY_NAME).map((k) => k.key)
  ]
  if (!allowAll && allowedKeys.length === 0) {
    throw new Error(`ERR_MDK_WORKER_ALLOWED_KEYS_REQUIRED: no trusted keys in ${DEFAULT_TRUSTED_KEYS_DIR} — start the Kernel first (it publishes kernel.pub), set MDK_WORKER_ALLOWED_KEYS, or MDK_WORKER_ALLOW_ALL=1 for local development`)
  }
  return { allowedKeys: [...new Set(allowedKeys)], allowAll, dir: DEFAULT_TRUSTED_KEYS_DIR }
}

// Keep following the trusted-keys dir after boot (a Gateway may publish later).
function _followTrust (handle, dir) {
  const { trustKeysFromDir } = require('@tetherto/mdk-core/lib/local-discovery')
  if (handle && handle.runtime) trustKeysFromDir(handle.runtime, dir)
  return handle
}

// Private HyperDHT settings (MDK_DHT_BOOTSTRAP, MDK_DHT_HOST) every service
// process passes to the DHT nodes it starts; empty means the public DHT.
function resolveDht (env = process.env) {
  return requireMdk().dhtFromEnv(env)
}

async function runWorker (repoRoot) {
  if (typeof repoRoot !== 'string' || !repoRoot) {
    throw new Error('ERR_MDK_REPO_ROOT_REQUIRED: runWorker needs the MDK source checkout (MDK_REPO_ROOT)')
  }
  const { initialize } = requireMdk()
  const worker = process.env.WORKER
  const type = process.env.TYPE
  const rack = process.env.RACK

  if (!worker || !rack) {
    throw new Error('ERR_MDK_WORKER_ENV: WORKER and RACK are required')
  }

  initialize({ sources: repoRoot })

  const root = process.env.MDK_WORKER_ROOT ||
    path.join(process.cwd(), 'data', rack)
  const kernelTopic = resolveKernelTopic()
  const { allowedKeys, allowAll, dir: trustDir } = resolveWorkerTrust()
  const dht = resolveDht()

  const { spec, factory } = resolveWorkerBoot(worker)

  if (spec.pool) {
    const workerId = `${spec.prefix}-${rack}`
    const storeDir = path.join(root, 'workers', workerId, 'store')
    fs.mkdirSync(storeDir, { recursive: true })
    return _followTrust(await factory({ workerId, rack, storeDir, root, kernelTopic, allowedKeys, allowAll, ...dht }), trustDir)
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

  const opts = { workerId, storeDir, kernelTopic, allowedKeys, allowAll, ...dht }
  if (!spec.noModelOpt) opts.model = model
  return _followTrust(await factory(opts), trustDir)
}

// The gateway worker's CLI flags; they land on its ctx, where it also reads
// its DHT settings.
function gatewayArgs ({ env, port, dht = {} }) {
  return [
    '--wtype', 'wrk-node-http',
    '--env', env,
    '--port', String(port),
    ...(dht.bootstrap ? ['--kernelBootstrap', dht.bootstrap.join(',')] : []),
    ...(dht.dhtHost ? ['--kernelDhtHost', dht.dhtHost] : [])
  ]
}

function runGateway () {
  const gatewayRoot = gatewayPackageDir()
  ensureConfigFromExamples(path.join(gatewayRoot, 'config'))

  const env = process.env.MDK_ENV || 'development'
  const port = process.env.PORT || '3000'
  const workerPath = path.join(gatewayRoot, 'worker.js')

  // Spawn so bfx-svc-boot-js uses gateway as serviceRoot (require.main.filename).
  const child = spawn(process.execPath, [workerPath, ...gatewayArgs({ env, port, dht: resolveDht() })], {
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

// The private HyperDHT bootstrap for a local / air-gapped site:
//   MDK_DHT_HOST   address it is reached at and advertised as (default 127.0.0.1)
//   MDK_DHT_PORT   UDP port (default 49737)
//   MDK_DHT_NODES  persistent nodes alongside it (default 2)
// Runs until SIGINT/SIGTERM.
async function runDhtBootstrap (env = process.env) {
  const { startDhtBootstrap, onShutdown } = requireMdk()
  const net = await startDhtBootstrap({
    host: env.MDK_DHT_HOST || '127.0.0.1',
    ...(env.MDK_DHT_PORT ? { port: Number(env.MDK_DHT_PORT) } : {}),
    ...(env.MDK_DHT_NODES ? { nodes: Number(env.MDK_DHT_NODES) } : {})
  })
  console.log(`mdk dht-bootstrap: serving ${net.bootstrap.join(',')} (set MDK_DHT_BOOTSTRAP=${net.bootstrap.join(',')} on every service)`)
  onShutdown(() => net.close())
  return net
}

async function main () {
  const service = process.env.SERVICE

  if (!service) {
    throw new Error('ERR_MDK_SERVICE_ENV: SERVICE env var is required (gateway | worker | dht-bootstrap)')
  }

  if (service === 'dht-bootstrap') {
    return runDhtBootstrap()
  }

  if (service === 'gateway') {
    return runGateway()
  }

  if (service === 'worker') {
    return runWorker(resolveRepoRoot())
  }

  throw new Error(`ERR_MDK_SERVICE_UNKNOWN: "${service}"`)
}

module.exports = {
  resolveRepoRoot,
  gatewayPackageDir,
  ensureConfigFromExamples,
  WORKER_BOOTS,
  resolveWorkerBoot,
  runGateway,
  gatewayArgs,
  runWorker,
  runDhtBootstrap,
  resolveWorkerTrust,
  resolveDht,
  main
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
