'use strict'

const { _calls: calls } = require('../..')

module.exports = async (ctx) => {
  calls.status[ctx.deviceId] = (calls.status[ctx.deviceId] || 0) + 1
  if (ctx.device.fail) throw new Error('unreachable 10.0.0.3')
  return ctx.device.status
}
