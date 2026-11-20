'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  const iv = stats.powermeter_specific?.instantaneous_values
  if (!iv) return 0
  return (iv.current_i1_a + iv.current_i2_a + iv.current_i3_a) / 3
}
