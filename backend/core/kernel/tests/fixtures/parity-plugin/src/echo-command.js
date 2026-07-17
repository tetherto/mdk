'use strict'

// Preserves the adapter-era applyThings echo the parity assertions read:
// which method ran, how many devices it hit, and the positional params.
module.exports = (method) => (ctx, params) => ({
  applied: 1,
  method,
  params: Object.values(params || {})
})
