'use strict'

const os = require('os')
const path = require('path')
const crypto = require('crypto')

const config = require('./config/mdk.config.json')
const { initialize, getOrk, startAppNode, startWorker, waitForDiscovery } = require('../../../backend/core/mdk')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const EXAMPLE_TMP = path.join(os.tmpdir(), 'mdk-site-single-process')
const ORK_ROOT = path.join(EXAMPLE_TMP, 'ork')
const APP_NODE_ROOT = path.join(EXAMPLE_TMP, 'app-node')
const ORK_IPC_SOCK = path.join(ORK_ROOT, 'ork.sock')

const WORKER_REGISTRY = {
  'miner-whatsminer:M56S': 'WM_M56S',
  'miner-whatsminer:M30SP': 'WM_M30SP',
  'miner-whatsminer:M30SPP': 'WM_M30SPP',
  'miner-whatsminer:M53S': 'WM_M53S',
  'miner-whatsminer:M63': 'WM_M63',
  'miner-antminer:S19XP': 'AM_S19XP',
  'miner-antminer:S19XPH': 'AM_S19XPH',
  'miner-antminer:S21': 'AM_S21',
  'miner-antminer:S21PRO': 'AM_S21PRO'
}

const WORKER_PACKAGES = {
  'miner-whatsminer': 'workers/miners/whatsminer',
  'miner-antminer': 'workers/miners/antminer'
}

function resolveManagerClass (worker, type) {
  const key = `${worker}:${type}`
  const exportName = WORKER_REGISTRY[key]
  if (!exportName) { throw new Error(`ERR_WORKER_UNKNOWN: no manager for ${key}`) }

  const pkgPath = WORKER_PACKAGES[worker]
  if (!pkgPath) { throw new Error(`ERR_WORKER_PACKAGE: unknown worker package "${worker}"`) }

  const mod = require(path.join(REPO_ROOT, 'packages', pkgPath))
  const ManagerClass = mod[exportName]
  if (!ManagerClass) { throw new Error(`ERR_WORKER_EXPORT: ${exportName} not found in ${worker}`) }
  return ManagerClass
}

async function main () {
  if (config.mode !== 'single-process') {
    throw new Error(`ERR_MODE: mode must be "single-process", got "${config.mode}"`)
  }
  if (!Array.isArray(config.services) || config.services.length === 0) {
    throw new Error('ERR_SERVICES: config.services must be a non-empty array')
  }

  const env = config.env || 'development'
  const noAuth = !!config.noAuth
  initialize()

  const orkTopic = crypto.randomBytes(32).toString('hex')
  let ork = null
  let shuttingDown = false

  const shutdown = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('[mdk-site]', `Received ${signal}, shutting down...`)
    setTimeout(() => process.exit(0), 5000).unref()

    if (ork) {
      const cleanups = ork._cleanup || []
      for (let i = cleanups.length - 1; i >= 0; i--) {
        try {
          await cleanups[i]()
        } catch (err) {
          console.error('[mdk-site]', 'cleanup error:', err)
        }
      }
      try {
        await ork.stop()
      } catch (err) {
        console.error('[mdk-site]', 'ork.stop error:', err)
      }
    }

    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  console.log('[mdk-site]', `Starting ${config.services.length} services in single-process mode (env=${env})`)

  for (const svc of config.services) {
    const logger = {
      log: (...args) => console.log(`[${svc.name}]`, ...args),
      error: (...args) => console.error(`[${svc.name}]`, ...args)
    }

    try {
      if (svc.kind === 'ork') {
        logger.log('Starting ORK')
        ork = await getOrk({
          topic: orkTopic,
          root: ORK_ROOT,
          ipc: { path: ORK_IPC_SOCK }
        })
        process.removeAllListeners('SIGINT')
        process.on('SIGINT', () => shutdown('SIGINT'))
        logger.log('Started')
        continue
      }

      if (svc.kind === 'app-node') {
        if (!ork) throw new Error('ERR_ORK_REQUIRED: declare an "ork" service before app-node')
        logger.log(`Starting app-node on port ${svc.port}${noAuth ? ' (noAuth)' : ''}`)
        const orkPubKey = ork.getPublicKey()
        const orkPubKeyHex = Buffer.isBuffer(orkPubKey) ? orkPubKey.toString('hex') : orkPubKey
        const hnd = await startAppNode({
          port: svc.port,
          env,
          noAuth,
          root: APP_NODE_ROOT,
          orkIpc: ORK_IPC_SOCK,
          common: {
            orks: { 'cluster-1': { rpcPublicKey: orkPubKeyHex } }
          }
        })
        ork._cleanup.push(() => new Promise((resolve) => hnd.stop(resolve)))
        logger.log('Started')
        continue
      }

      if (svc.kind === 'worker') {
        if (!ork) throw new Error('ERR_ORK_REQUIRED: declare an "ork" service before workers')
        logger.log(`Starting ${svc.worker} ${svc.type} on rack ${svc.rack}`)
        const ManagerClass = resolveManagerClass(svc.worker, svc.type)
        await startWorker(ManagerClass, {
          ork,
          rack: svc.rack,
          root: path.join(process.cwd(), 'data', svc.rack),
          wtype: 'wrk-thing',
          workerId: `${ManagerClass.name}-${svc.rack}`
        })
        logger.log('Started')
        continue
      }

      logger.error(`Unknown service kind "${svc.kind}", skipping`)
    } catch (err) {
      logger.error('Failed to start:', err)
    }
  }

  if (ork) {
    console.log('[mdk-site]', 'Waiting for workers to register with ORK...')
    const workers = await waitForDiscovery(ork, 10000)
    const summary = workers.length === 0
      ? '(none)'
      : workers.map(w => `${w.workerId || w.id || 'unknown'} state=${w.state}`).join(', ')
    console.log('[mdk-site]', `ORK sees ${workers.length} worker(s): ${summary}`)
  }

  console.log('[mdk-site]', 'All services started. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-single-process] Fatal:', err)
  process.exit(1)
})
