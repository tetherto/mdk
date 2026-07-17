'use strict'

module.exports = async (ctx) => {
  ctx.device.applied.push({ method: 'factoryReset', thingIds: [ctx.deviceId] })
  return 1
}
