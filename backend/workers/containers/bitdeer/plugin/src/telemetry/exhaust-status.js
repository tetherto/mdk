'use strict'

module.exports = async (ctx) => {
  const status = await ctx.device.getExhaustFanStatus()
  if (!status) return 'unknown'
  return status.airExhaustEnabled ? 'enabled' : 'disabled'
}
