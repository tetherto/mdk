'use strict'

module.exports = async (ctx) => {
  ctx.device.applied.push({ method: 'reboot', thingIds: [ctx.deviceId] })
  return 1
}
