'use strict'

const readStats = require('../read-stats')

module.exports = async (ctx) => {
  const stats = await readStats(ctx)
  const iv = stats.powermeter_specific?.instantaneous_values
  if (!iv) return 0
  return (iv.power_factor_l1 + iv.power_factor_l2 + iv.power_factor_l3) / 3
}
