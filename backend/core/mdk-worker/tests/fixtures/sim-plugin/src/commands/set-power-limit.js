'use strict'

module.exports = async (ctx, params) => {
  ctx.device.powerLimit = params.limit_watts
  return { deviceId: ctx.deviceId, watts: params.limit_watts, ok: true }
}
