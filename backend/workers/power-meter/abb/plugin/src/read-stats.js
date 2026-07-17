'use strict'

// Telemetry channels read from the device cache when the snap loop has
// already populated it; the first pull does a live Modbus read via getSnap.
module.exports = async (ctx) => {
  const device = ctx.device
  const snap = device.cache === null
    ? await device.getSnap()
    : await device.getRealtimeData()
  return snap?.stats || {}
}
