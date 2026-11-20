'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  return stats.powermeter_specific?.instantaneous_values?.current_avg_a ?? 0
}
