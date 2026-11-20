'use strict'

const read = require('../read')

module.exports = async (params) => {
  const estats = await read.estats(params)
  return Math.floor((parseFloat(estats.temperature_avg) || 0) * 100) / 100
}
