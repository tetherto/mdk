'use strict'

module.exports = async (ctx, params) => {
  // The site UI's modes are low|normal|high; firmware v3 calls low "eco".
  // Translating vendor-agnostic modes to firmware terms is the adapter's job.
  const mode = params.mode === 'low' ? 'eco' : params.mode
  const result = await ctx.device.setPowerMode(mode)
  ctx.device.db.recordCommand(ctx.deviceId, 'setPowerMode', params, result)
  return result
}
