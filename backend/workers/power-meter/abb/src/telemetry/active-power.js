'use strict'

const readSnap = require('../read-snap')

module.exports = async (params) => {
  const { stats } = await readSnap(params)
  return stats.power_w ?? 0
}
