'use strict'

const readSnap = require('../read-snap')

// The PM180 register map read by this worker does not include line
// frequency; the channel exists for doc parity with the legacy contract and
// still touches the meter so an unreachable one fails like every other channel.
module.exports = async (params) => {
  await readSnap(params)
  return 0
}
