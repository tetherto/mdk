'use strict'

const readStats = require('../read-stats')

module.exports = async (ctx) => {
  const stats = await readStats(ctx)
  return stats.powermeter_specific?.v2_n_v ?? 0
}
