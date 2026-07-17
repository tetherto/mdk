'use strict'

// The PM180 register map read by this worker does not include line
// frequency; the channel exists for doc parity with the legacy contract.
module.exports = async () => {
  return 0
}
