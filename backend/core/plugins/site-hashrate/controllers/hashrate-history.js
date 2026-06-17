'use strict'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

module.exports = async function hashrateHistory (req, services) {
  const { mdkClient } = services

  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const now = Date.now()
  const start = Number(req.query.start) || (now - 7 * ONE_DAY_MS)
  const end = Number(req.query.end) || now

  if (start >= end) throw new Error('ERR_INVALID_DATE_RANGE')

  const workersResp = await mdkClient.listWorkers()
  const workerList = workersResp?.payload?.workers || []

  const deviceIds = workerList.flatMap(w => w.deviceIds || [])

  const results = await Promise.allSettled(
    deviceIds.map(deviceId =>
      mdkClient.pullTelemetry(deviceId, 'hashrate_history')
    )
  )

  const byTs = {}
  let totalHashrateMhs = 0
  let pointCount = 0

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const history = result.value?.payload?.history
    if (!Array.isArray(history)) continue

    for (const point of history) {
      if (!point || point.ts < start || point.ts > end) continue
      const v = Number(point.hashrateMhs) || 0
      byTs[point.ts] = (byTs[point.ts] || 0) + v
      totalHashrateMhs += v
      pointCount++
    }
  }

  const log = Object.keys(byTs)
    .sort((a, b) => a - b)
    .map(ts => ({ ts: Number(ts), hashrateMhs: byTs[ts] }))

  return {
    log,
    summary: {
      avgHashrateMhs: pointCount ? totalHashrateMhs / pointCount : null,
      totalHashrateMhs
    }
  }
}
