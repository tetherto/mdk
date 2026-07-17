'use strict'

module.exports = async (ctx, params) => {
  ctx.device.applied.push({ method: 'setLED', thingIds: [ctx.deviceId], params })
  return params.enabled ? 1 : 0
}
