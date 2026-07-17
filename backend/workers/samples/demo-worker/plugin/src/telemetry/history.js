'use strict'

// Served from the worker's own SQLite store — the sampler in boot.js writes
// these rows; the device is not contacted.
module.exports = async (ctx, params) => {
  const limit = Number(params && params.limit) || 10
  return ctx.device.db.recentSamples(ctx.deviceId, limit)
}
