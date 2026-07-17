'use strict'

const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Prefer a local config copy if present; otherwise fall back to the committed
// example so the project runs clone-and-run with zero setup.
const LOCAL_CONFIG = path.join(__dirname, 'config', 'mdk.config.json')
const EXAMPLE_CONFIG = path.join(__dirname, 'config', 'mdk.config.json.example')
const config = fs.existsSync(LOCAL_CONFIG)
  ? require(LOCAL_CONFIG)
  : JSON.parse(fs.readFileSync(EXAMPLE_CONFIG, 'utf8'))

const { initialize, getKernel, startGateway, waitForDiscovery } = require('../../../backend/core/mdk')
const { resolveWorkerBoot } = require('../../../backend/core/mdk/utils/service-bootstrap')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const EXAMPLE_TMP = path.join(os.tmpdir(), 'mdk-site-single-process')
const KERNEL_ROOT = path.join(EXAMPLE_TMP, 'kernel')
const GATEWAY_ROOT = path.join(EXAMPLE_TMP, 'gateway')

// Every family boots through its package's runtime plugin boot; TYPE maps to
// the boot's model id via the shared WORKER_BOOTS registry.
async function startWorkerService (kernel, svc) {
  const { spec, factory } = resolveWorkerBoot(REPO_ROOT, svc.worker)

  let workerId
  const opts = {}
  if (spec.pool) {
    workerId = `${spec.prefix}-${svc.rack}`
    opts.rack = svc.rack
  } else {
    const model = spec.models[svc.type]
    if (!model) { throw new Error(`ERR_WORKER_UNKNOWN: no plugin model for ${svc.worker}:${svc.type}`) }
    workerId = `${spec.prefix}-${model}-${svc.rack}`
    if (!spec.noModelOpt) opts.model = model
  }

  opts.workerId = workerId
  opts.storeDir = path.join(EXAMPLE_TMP, 'data', svc.rack, 'workers', workerId, 'store')
  fs.mkdirSync(opts.storeDir, { recursive: true })
  if (svc.seedDevices) opts.seedDevices = svc.seedDevices

  const handle = await factory(opts)
  await kernel.registerWorker(handle.runtime.getPublicKey())
  kernel._cleanup.push(() => handle.stop())
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

  const kernelTopic = crypto.randomBytes(32).toString('hex')
  let kernel = null
  let shuttingDown = false

  const shutdown = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('[mdk-site]', `Received ${signal}, shutting down...`)
    setTimeout(() => process.exit(0), 5000).unref()

    if (kernel) {
      const cleanups = kernel._cleanup || []
      for (let i = cleanups.length - 1; i >= 0; i--) {
        try {
          await cleanups[i]()
        } catch (err) {
          console.error('[mdk-site]', 'cleanup error:', err)
        }
      }
      try {
        await kernel.stop()
      } catch (err) {
        console.error('[mdk-site]', 'kernel.stop error:', err)
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
      if (svc.kind === 'kernel') {
        logger.log('Starting Kernel')
        kernel = await getKernel({
          topic: kernelTopic,
          root: KERNEL_ROOT
        })
        process.removeAllListeners('SIGINT')
        process.on('SIGINT', () => shutdown('SIGINT'))
        logger.log('Started')
        continue
      }

      if (svc.kind === 'gateway') {
        if (!kernel) throw new Error('ERR_KERNEL_REQUIRED: declare an "kernel" service before gateway')
        logger.log(`Starting gateway on port ${svc.port}${noAuth ? ' (noAuth)' : ''}`)
        const orkPubKey = kernel.getPublicKey()
        const orkPubKeyHex = Buffer.isBuffer(orkPubKey) ? orkPubKey.toString('hex') : orkPubKey
        const hnd = await startGateway({
          port: svc.port,
          env,
          noAuth,
          root: GATEWAY_ROOT,
          kernelKey: orkPubKeyHex,
          common: {
            orks: { 'cluster-1': { rpcPublicKey: orkPubKeyHex } }
          }
        })
        kernel._cleanup.push(() => new Promise((resolve) => hnd.stop(resolve)))
        logger.log('Started')
        continue
      }

      if (svc.kind === 'worker') {
        if (!kernel) throw new Error('ERR_KERNEL_REQUIRED: declare an "kernel" service before workers')
        logger.log(`Starting ${svc.worker} ${svc.type || ''} on rack ${svc.rack}`)
        await startWorkerService(kernel, svc)
        logger.log('Started')
        continue
      }

      logger.error(`Unknown service kind "${svc.kind}", skipping`)
    } catch (err) {
      logger.error('Failed to start:', err)
    }
  }

  if (kernel) {
    console.log('[mdk-site]', 'Waiting for workers to register with Kernel...')
    const workers = await waitForDiscovery(kernel, 10000)
    const summary = workers.length === 0
      ? '(none)'
      : workers.map(w => `${w.workerId || w.id || 'unknown'} state=${w.state}`).join(', ')
    console.log('[mdk-site]', `Kernel sees ${workers.length} worker(s): ${summary}`)
  }

  console.log('[mdk-site]', 'All services started. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-single-process] Fatal:', err)
  process.exit(1)
})
