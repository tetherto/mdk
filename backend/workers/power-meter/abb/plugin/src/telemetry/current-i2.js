'use strict'

const readStats = require('../read-stats')

module.exports = async (ctx) => {
  const stats = await readStats(ctx)
  return stats.powermeter_specific?.i2_a ?? 0
}
