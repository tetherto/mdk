'use strict'

module.exports = async (ctx) => {
  const status = await ctx.device.getTankStatus()
  if (!status) return 'unknown'
  return `tank1:${status.tank1Enabled ? 'enabled' : 'disabled'},tank2:${status.tank2Enabled ? 'enabled' : 'disabled'}`
}
