'use strict'

module.exports = async (ctx) => {
  const stats = ctx.device.data.statsData.stats || []
  return stats.reduce((sum, s) => sum + (s.estimated_today_income || 0), 0)
}
