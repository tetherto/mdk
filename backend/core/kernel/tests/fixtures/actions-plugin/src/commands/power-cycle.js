'use strict'

module.exports = async (ctx) => {
  ctx.device.applied.push({ method: 'powerCycle', thingIds: [ctx.deviceId] })
  return 1
}
