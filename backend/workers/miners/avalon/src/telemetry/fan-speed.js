'use strict'

const read = require('../read')

module.exports = async (params) => {
  const estats = await read.estats(params)
  const fan1 = parseFloat(estats.fan1) || 0
  const fan2 = parseFloat(estats.fan2) || 0
  return Math.round((fan1 + fan2) / 2)
}
