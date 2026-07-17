'use strict'

module.exports = async (ctx) => {
  const result = await ctx.device.reboot()
  ctx.device.db.recordCommand(ctx.deviceId, 'reboot', {}, result)
  return result
}
