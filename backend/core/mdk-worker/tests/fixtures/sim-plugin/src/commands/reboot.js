'use strict'

module.exports = async (ctx) => {
  ctx.device.uptime = 0
  return { rebooted: true }
}
