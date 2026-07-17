'use strict'

const { DEFAULT_MINER_COUNT, workerSpec } = require('../../backend/site')
const { parseMinerCount } = require('../../backend/argv')
const { startComponent, requireRunning } = require('./components')

// Start one component:
//   start mocks | kernel | gateway | ui | mcp-server
//   start worker <whatsminer|antminer|avalon|antspace|bitdeer|abb|satec|schneider|seneca|minerpool|f2pool>
// Unmet dependencies fail with a clear ERR_*.
async function start (ctx, { args, flags }) {
  const target = args[0]
  if (!target) throw new Error('ERR_START_TARGET_REQUIRED')
  const minerCount = flags.miners ? parseMinerCount(flags.miners, DEFAULT_MINER_COUNT) : DEFAULT_MINER_COUNT

  if (target === 'worker') {
    const spec = workerSpec(args[1])
    if (!spec) throw new Error(`ERR_UNKNOWN_WORKER: ${args[1] || ''}`)
    requireRunning(ctx, 'kernel')
    requireRunning(ctx, 'mocks')
    await startComponent(ctx, spec.workerId, { minerCount })
    ctx.print(`${spec.workerId} up`)
    return
  }

  if (target === 'gateway') requireRunning(ctx, 'kernel')
  if (target === 'ui') requireRunning(ctx, 'gateway')
  if (target === 'mcp-server') requireRunning(ctx, 'kernel')

  await startComponent(ctx, target, { minerCount })
  ctx.print(`${target} up`)
}

module.exports = { start }
