'use strict'

const { _calls: calls } = require('../..')

module.exports = async (ctx) => {
  calls.stats[ctx.deviceId] = (calls.stats[ctx.deviceId] || 0) + 1
  if (ctx.device.fail || ctx.device.failStats) throw new Error('ERR_DEVICE_TIMEOUT: simulated')
  return { power: ctx.device.power, minerData: { hashrate: ctx.device.hashrate } }
}
