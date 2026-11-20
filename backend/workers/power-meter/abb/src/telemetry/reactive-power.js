'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  return stats.powermeter_specific?.reactive_power_total_var ?? 0
}
