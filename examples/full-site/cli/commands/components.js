'use strict'

// Shared spawn descriptors + dependency checks used by the up/start handlers.

const path = require('path')
const { WORKER_SPECS, workerSpec } = require('../../backend/site')

const COMPONENTS = ['mocks', 'ork', 'app-node', 'ui']

// The per-process boot entrypoints live in the MDK layer (backend/proc/*.js).
function procEntry (siteDir, file) {
  return path.join(siteDir, 'backend', 'proc', file)
}

// Resolve a user token (component name or short/long worker name) to the proc
// name the ProcessManager tracks it under.
function resolveProcName (token) {
  if (COMPONENTS.includes(token)) return token
  const spec = workerSpec(token)
  return spec ? spec.workerId : null
}

// { procName, entry, argv } for spawning a component or worker, or null.
// The ORK and workers must agree on discovery mode, so both inherit ctx.discovery
// (default 'local'); --discovery threads it to the proc entrypoints.
function spawnDescriptor (ctx, name, { minerCount } = {}) {
  const siteDir = ctx.siteDir
  const discovery = ctx.discovery || process.env.MDK_DISCOVERY || 'local'
  switch (name) {
    case 'mocks':
      return { procName: 'mocks', entry: procEntry(siteDir, 'mocks.js'), argv: ['--miners', String(minerCount)] }
    case 'ork':
      return { procName: 'ork', entry: procEntry(siteDir, 'ork.js'), argv: ['--root', ctx.root, '--discovery', discovery] }
    case 'app-node':
      return { procName: 'app-node', entry: procEntry(siteDir, 'app-node.js'), argv: ['--root', ctx.root, '--port', String(ctx.httpPort)] }
    case 'ui':
      return { procName: 'ui', entry: procEntry(siteDir, 'ui.js'), argv: ['--port', String(ctx.uiPort), '--http-port', String(ctx.httpPort)] }
    default: {
      const spec = workerSpec(name)
      if (!spec) return null
      return { procName: spec.workerId, entry: procEntry(siteDir, 'worker.js'), argv: ['--worker', spec.name, '--miners', String(minerCount), '--root', ctx.root, '--discovery', discovery] }
    }
  }
}

// Spawn a component/worker and wait for its readiness token.
async function startComponent (ctx, name, { minerCount, readyTimeoutMs = 45000 } = {}) {
  const desc = spawnDescriptor(ctx, name, { minerCount })
  if (!desc) throw new Error(`ERR_UNKNOWN_COMPONENT: ${name}`)
  if (ctx.pm.isAlive(desc.procName)) throw new Error(`ERR_PROC_ALREADY_RUNNING: ${desc.procName}`)
  ctx.pm.spawn(desc.procName, desc.entry, desc.argv)
  await ctx.pm.waitForReady(desc.procName, readyTimeoutMs)
  return desc.procName
}

// Start a component, retrying once if it exits before becoming ready. Other
// errors (unknown component, already running) are not retried.
async function startComponentResilient (ctx, name, opts = {}) {
  const retryDelayMs = opts.retryDelayMs == null ? 2500 : opts.retryDelayMs
  try {
    return await startComponent(ctx, name, opts)
  } catch (err) {
    if (!/ERR_PROC_EXITED|ERR_PROC_READY_TIMEOUT/.test(err.message)) throw err
    if (opts.onRetry) opts.onRetry(name, err)
    if (ctx.pm.has(name) && ctx.pm.isAlive(name)) { try { await ctx.pm.stop(name) } catch {} }
    // Let the exited process's store close before re-spawning into the same dir.
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    return startComponent(ctx, name, opts)
  }
}

function requireRunning (ctx, name) {
  if (!ctx.pm.isAlive(name)) {
    throw new Error(`ERR_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_NOT_RUNNING`)
  }
}

module.exports = { COMPONENTS, WORKER_SPECS, spawnDescriptor, startComponent, startComponentResilient, resolveProcName, requireRunning }
