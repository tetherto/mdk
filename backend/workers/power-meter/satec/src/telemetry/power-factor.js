'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  const iv = stats.powermeter_specific?.instantaneous_values
  if (!iv) return 0
  return (iv.power_factor_l1 + iv.power_factor_l2 + iv.power_factor_l3) / 3
}
