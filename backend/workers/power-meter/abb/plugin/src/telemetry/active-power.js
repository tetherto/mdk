'use strict'

const readStats = require('../read-stats')

module.exports = async (ctx) => {
  const stats = await readStats(ctx)
  return stats.power_w ?? 0
}
