'use strict'

const read = require('../read')

module.exports = async (params) => {
  const estats = await read.estats(params)
  const stats = await read.stats(params)
  const power = parseFloat(estats.object_power_consumption)
  const hashrate = parseFloat(stats.mhs_av)
  if (!hashrate) return 0
  const efficiency = power / hashrate * 1000000
  return isNaN(efficiency) ? 0 : +efficiency.toFixed(2)
}
