'use strict'

module.exports = async (ctx) => {
  const device = ctx.device
  const snap = device.cache === null
    ? await device.getSnap()
    : await device.getRealtimeData()
  return snap?.stats?.temp_c ?? 0
}
