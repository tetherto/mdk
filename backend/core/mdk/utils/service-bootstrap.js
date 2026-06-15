'use strict'

const fs = require('fs')
const path = require('path')
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

function resolveManagerClass (repoRoot, worker, type) {
  const registryKey = `${worker}:${type}`
  const exportName = WORKER_REGISTRY[registryKey]
  if (!exportName) {
    throw new Error(`ERR_MDK_WORKER_UNKNOWN: no manager for ${registryKey}`)
  }

  const pkgPath = WORKER_PACKAGES[worker]
  if (!pkgPath) {
    throw new Error(`ERR_MDK_WORKER_PACKAGE: unknown worker package "${worker}"`)
  }

  const mod = require(path.join(repoRoot, 'backend', pkgPath))
  const ManagerClass = mod[exportName]
  if (!ManagerClass) {
    throw new Error(`ERR_MDK_WORKER_EXPORT: ${exportName} not found in ${worker}`)
  }
  return ManagerClass
}

function requireMdk (repoRoot) {
  return require(path.join(repoRoot, 'backend', 'core', 'mdk'))
}

async function runWorker (repoRoot) {
  const { startWorker, initialize } = requireMdk(repoRoot)
  const worker = process.env.WORKER
  const type = process.env.TYPE
  const rack = process.env.RACK

  if (!worker || !type || !rack) {
    throw new Error('ERR_MDK_WORKER_ENV: WORKER, TYPE, and RACK are required')
  }

  initialize()

  const ManagerClass = resolveManagerClass(repoRoot, worker, type)
  const root = process.env.MDK_WORKER_ROOT ||
    path.join(process.cwd(), 'data', rack)

  await startWorker(ManagerClass, {
    rack,
    root,
    wtype: 'wrk-thing',
    workerId: `${ManagerClass.name}-${rack}`
  })
}

function runAppNode (repoRoot) {
  const appNodeRoot = path.join(repoRoot, 'backend', 'core', 'app-node')
  ensureConfigFromExamples(path.join(appNodeRoot, 'config'))

  const env = process.env.MDK_ENV || 'development'
  const port = process.env.PORT || '3000'
  const workerPath = path.join(appNodeRoot, 'worker.js')

  // Spawn so bfx-svc-boot-js uses app-node as serviceRoot (require.main.filename).
  const child = spawn(process.execPath, [
    workerPath,
    '--wtype', 'wrk-node-http',
    '--env', env,
    '--port', String(port)
  ], {
    cwd: appNodeRoot,
    stdio: 'inherit',
    env: process.env
  })

  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) return resolve()
      reject(new Error(
        `app-node exited with code ${code}${signal ? ` (${signal})` : ''}`
      ))
    })
  })
}

async function main () {
  const repoRoot = findRepoRoot(__dirname)
  const service = process.env.SERVICE

  if (!service) {
    throw new Error('ERR_MDK_SERVICE_ENV: SERVICE env var is required (app-node | worker)')
  }

  if (service === 'app-node') {
    return runAppNode(repoRoot)
  }

  if (service === 'worker') {
    return runWorker(repoRoot)
  }

  throw new Error(`ERR_MDK_SERVICE_UNKNOWN: "${service}"`)
}

module.exports = {
  findRepoRoot,
  ensureConfigFromExamples,
  resolveManagerClass,
  runAppNode,
  runWorker,
  main
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
