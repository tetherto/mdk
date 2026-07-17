'use strict'

const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Prefer a local config copy if present; otherwise fall back to the committed
// example so the project runs clone-and-run with zero setup (and is runnable by
// examples/backend/run-examples.js). The .example file is read+parsed manually
// because require() only treats a .json extension as JSON.
const LOCAL_CONFIG = path.join(__dirname, 'config', 'mdk.config.json')
const EXAMPLE_CONFIG = path.join(__dirname, 'config', 'mdk.config.json.example')
const config = fs.existsSync(LOCAL_CONFIG)
  ? require(LOCAL_CONFIG)
  : JSON.parse(fs.readFileSync(EXAMPLE_CONFIG, 'utf8'))

// This example lives under examples/backend/miners/antminer/, so the repo root is
// four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { initialize, getKernel, startGateway, waitForDiscovery } = require(path.join(REPO_ROOT, 'backend', 'core', 'mdk'))
const { startAntminerWorker } = require(path.join(REPO_ROOT, 'backend', 'workers', 'miners', 'antminer'))

const EXAMPLE_TMP = path.join(os.tmpdir(), 'mdk-site-antminer')
const KERNEL_ROOT = path.join(EXAMPLE_TMP, 'kernel')
const GATEWAY_ROOT = path.join(EXAMPLE_TMP, 'gateway')

// config `type` (registry key) -> runtime boot model / Antminer mock type.
// Note S19XPH maps to the underscored `s19xp_h` the mock router/initial-state use.
const ANTMINER_MODEL = {
  S19XP: 's19xp',
  S19XPH: 's19xp_h',
  S21: 's21',
  S21PRO: 's21pro'
}

// The Antminer mock speaks Bitmain's HTTP digest API. Start one per worker on
// its own port; returns the mock handle so we can close it on shutdown.
const amMock = require(path.join(REPO_ROOT, 'backend', 'workers', 'miners', 'antminer', 'mock', 'server'))

const startMock = (svc) => {
  const mockType = ANTMINER_MODEL[svc.type]
  if (!mockType) { throw new Error(`ERR_MOCK_TYPE: no mock type for ${svc.type}`) }
  return amMock.createServer({
    port: svc.mock.port,
    host: '127.0.0.1',
    type: mockType,
    serial: svc.mock.serialNum,
    password: svc.mock.password || 'root'
  })
}

const main = async () => {
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
  const mockHandles = []
  const workerHandles = []
  const registered = []

  const shutdown = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('[mdk-antminer]', `Received ${signal}, shutting down...`)
    setTimeout(() => process.exit(0), 5000).unref()

    // Stop the mock HTTP servers first so the ports free for an immediate re-run.
    for (const h of mockHandles) {
      try { h.stop() } catch (err) { console.error('[mdk-antminer]', 'mock stop error:', err) }
    }

    for (const h of workerHandles) {
      try { await h.stop() } catch (err) { console.error('[mdk-antminer]', 'worker stop error:', err) }
    }

    if (kernel) {
      const cleanups = kernel._cleanup || []
      for (let i = cleanups.length - 1; i >= 0; i--) {
        try {
          await cleanups[i]()
        } catch (err) {
          console.error('[mdk-antminer]', 'cleanup error:', err)
        }
      }
      try {
        await kernel.stop()
      } catch (err) {
        console.error('[mdk-antminer]', 'kernel.stop error:', err)
      }
    }

    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  console.log('[mdk-antminer]', `Starting ${config.services.length} services in single-process mode (env=${env})`)

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
          root: KERNEL_ROOT,
          keyFile: path.join(KERNEL_ROOT, '.kernel-key')
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
        if (!svc.mock) throw new Error(`ERR_MOCK_REQUIRED: worker "${svc.name}" needs a "mock" block`)
        const model = ANTMINER_MODEL[svc.type]
        if (!model) throw new Error(`ERR_WORKER_UNKNOWN: no model for ${svc.type}`)
        logger.log(`Starting ${svc.worker} ${svc.type} on rack ${svc.rack}`)

        // Bring up the mock device first; the runtime seeds it into the
        // persisted provisioning store on first boot.
        const mock = startMock(svc)
        mockHandles.push(mock)

        const workerId = `antminer-${model}-${svc.rack}`
        const handle = await startAntminerWorker({
          workerId,
          model,
          storeDir: path.join(EXAMPLE_TMP, 'workers', workerId, 'store'),
          seedDevices: [{
            info: { container: svc.mock.container, serialNum: svc.mock.serialNum, pos: svc.mock.pos },
            opts: {
              address: '127.0.0.1',
              port: svc.mock.port,
              username: svc.mock.username || 'root',
              password: svc.mock.password || 'root'
            }
          }]
        })
        workerHandles.push(handle)
        await kernel.registerWorker(handle.runtime.getPublicKey())

        const deviceId = handle.services.provisioning.listDeviceIds()[0]
        registered.push({ name: svc.name, type: svc.type, deviceId, port: svc.mock.port })
        logger.log(`Started; seeded ${svc.type} ${svc.mock.serialNum} (mock :${svc.mock.port})`)
        continue
      }

      logger.error(`Unknown service kind "${svc.kind}", skipping`)
    } catch (err) {
      logger.error('Failed to start:', err)
    }
  }

  if (kernel) {
    console.log('[mdk-antminer]', 'Waiting for workers to register with Kernel...')
    const workers = await waitForDiscovery(kernel, 10000)
    const summary = workers.length === 0
      ? '(none)'
      : workers.map(w => `${w.workerId || w.id || 'unknown'} state=${w.state}`).join(', ')
    console.log('[mdk-antminer]', `Kernel sees ${workers.length} worker(s): ${summary}`)

    const orkPubKey = kernel.getPublicKey()
    console.log('[mdk-antminer]', 'Kernel HRPC key:', Buffer.isBuffer(orkPubKey) ? orkPubKey.toString('hex') : orkPubKey)
    for (const r of registered) {
      console.log('[mdk-antminer]', `  ${r.type.padEnd(7)} ${r.name.padEnd(12)} device=${r.deviceId} mock=:${r.port}`)
    }
  }

  console.log('[mdk-antminer]', 'All services started. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-antminer] Fatal:', err)
  process.exit(1)
})
