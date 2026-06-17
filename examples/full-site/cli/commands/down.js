'use strict'

// Stop all children in reverse dependency order.
async function down (ctx) {
  const stopped = await ctx.pm.stopAll()
  ctx.print(stopped.length ? `stopped: ${stopped.join(', ')}` : '(nothing running)')
}

module.exports = { down }
