'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  return stats.powermeter_specific?.instantaneous_values?.power_factor_total ?? 0
}
