'use strict'

module.exports = async (ctx) => {
  await ctx.device.reboot()
  return { rebooted: true }
}
