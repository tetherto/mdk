'use strict'

const { DEFAULT_MINER_COUNT, workerSpec } = require('../../backend/site')
const { startComponent, requireRunning } = require('./components')

// Start one component:
//   start mocks | ork | app-node | ui
//   start worker <miner|container|powermeter|minerpool>
// Unmet dependencies fail with a clear ERR_*.
async function start (ctx, { args, flags }) {
  const target = args[0]
  if (!target) throw new Error('ERR_START_TARGET_REQUIRED')
  const minerCount = flags.miners ? Number(flags.miners) : DEFAULT_MINER_COUNT

  if (target === 'worker') {
    const spec = workerSpec(args[1])
    if (!spec) throw new Error(`ERR_UNKNOWN_WORKER: ${args[1] || ''}`)
    requireRunning(ctx, 'ork')
    requireRunning(ctx, 'mocks')
    await startComponent(ctx, spec.workerId, { minerCount })
    ctx.print(`${spec.workerId} up`)
    return
  }

  if (target === 'app-node') requireRunning(ctx, 'ork')
  if (target === 'ui') requireRunning(ctx, 'app-node')

  await startComponent(ctx, target, { minerCount })
  ctx.print(`${target} up`)
}

module.exports = { start }
