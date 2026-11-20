'use strict'

const read = require('../read')

module.exports = async (params) => {
  const stats = await read.stats(params)
  return Math.floor((parseFloat(stats.mhs_av) || 0) / 10000) / 100
}
