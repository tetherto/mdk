'use strict'

// The only place aggregation happens: fan out per-device telemetry pulls via
// mdk-client and combine. Workers are structurally single-device.
module.exports = async function fleetSummary (req, services) {
  const { mdkClient } = services
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const workersResp = await mdkClient.listWorkers()
  const deviceIds = (workersResp?.workers || []).flatMap(w => w.deviceIds || [])

  const results = await Promise.allSettled(deviceIds.map(async (deviceId) => {
    const res = await mdkClient.pullTelemetry(deviceId, 'metrics')
    return { deviceId, metrics: res?.metrics || null }
  }))

  const devices = []
  let totalHashrateThs = 0
  let totalPowerW = 0
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value.metrics) continue
    const { deviceId, metrics } = r.value
    devices.push({ deviceId, hashrateThs: metrics.hashrate_rt, powerW: metrics.power })
    totalHashrateThs += Number(metrics.hashrate_rt) || 0
    totalPowerW += Number(metrics.power) || 0
  }

  return { deviceCount: devices.length, totalHashrateThs, totalPowerW, devices }
}
