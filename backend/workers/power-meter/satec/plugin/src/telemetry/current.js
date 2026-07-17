'use strict'

const readStats = require('../read-stats')

module.exports = async (ctx) => {
  const stats = await readStats(ctx)
  const iv = stats.powermeter_specific?.instantaneous_values
  if (!iv) return 0
  return (iv.current_i1_a + iv.current_i2_a + iv.current_i3_a) / 3
}
