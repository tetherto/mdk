'use strict'

const read = require('../read')

module.exports = async (params) => {
  const stats = await read.stats(params)
  return parseInt(stats.elapsed, 10) || 0
}
