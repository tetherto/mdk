'use strict'

const { resolveProcName } = require('./components')

// Stop one process cleanly (SIGTERM → SIGKILL). Accepts component names, full
// worker ids, or short worker names (and `stop worker <name>`).
async function stop (ctx, { args }) {
  let token = args[0]
  if (!token) throw new Error('ERR_STOP_TARGET_REQUIRED')
  if (token === 'worker' && args[1]) token = args[1]

  const name = resolveProcName(token) || token
  if (!ctx.pm.has(name)) throw new Error(`ERR_PROC_NOT_FOUND: ${name}`)
  await ctx.pm.stop(name)
  ctx.print(`stopped ${name}`)
}

module.exports = { stop }
