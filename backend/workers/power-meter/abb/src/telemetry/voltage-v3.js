'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  return stats.powermeter_specific?.v3_n_v ?? 0
}
