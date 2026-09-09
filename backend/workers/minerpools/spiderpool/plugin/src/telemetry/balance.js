'use strict'

module.exports = async (ctx) => {
  const stats = ctx.device.data.statsData.stats || []
  return stats.reduce((sum, s) => sum + (s.balance || 0), 0)
}
