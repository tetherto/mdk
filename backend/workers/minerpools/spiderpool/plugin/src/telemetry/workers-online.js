'use strict'

module.exports = async (ctx) => {
  return ctx.device.data.workersData.workers.length
}
