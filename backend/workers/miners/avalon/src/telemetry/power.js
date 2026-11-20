'use strict'

const read = require('../read')

module.exports = async (params) => {
  const estats = await read.estats(params)
  return parseFloat(estats.object_power_consumption) || 0
}
