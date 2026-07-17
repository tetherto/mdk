'use strict'

const readStats = require('../read-stats')

module.exports = async (ctx) => {
  const stats = await readStats(ctx)
  return stats.powermeter_specific?.v1_n_v ?? stats.voltage_v ?? 0
}
