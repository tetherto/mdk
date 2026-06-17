'use strict'

const { loadSite } = require('../lib/site')

const ONE_HOUR_MS = 60 * 60 * 1000

// Historical time-series, both persisted by the real workers:
//   power     — site powermeter tail-log (telemetry.pull 'logs' on thing-5m)
//   hashrate  — pool stats-history (telemetry.pull 'ext_data' key 'stats-history'),
//               the scheduler worker's persisted stats series.
module.exports = async function history (req, services) {
  const metric = (req.query && req.query.metric) || 'hashrate'
  if (metric !== 'hashrate' && metric !== 'power') throw new Error('ERR_UNKNOWN_METRIC')

  const now = Date.now()
  const end = Number(req.query && req.query.end) || now
  const start = Number(req.query && req.query.start) || (end - ONE_HOUR_MS)
  if (start >= end) throw new Error('ERR_INVALID_DATE_RANGE')

  const { byFamily, pool } = await loadSite(services.mdkClient)

  if (metric === 'power') {
    const device = (byFamily['power-meter'] || [])[0]
    if (!device) return { metric, unit: 'W', log: [] }
    const tel = await services.mdkClient.pullTelemetry(device.id, {
      type: 'logs', key: 'thing-5m', tag: device.id, start, end, limit: 5000
    })
    const log = ((tel && tel.logs) || [])
      .filter(e => e && e.snap && e.snap.stats)
      .map(e => ({ ts: e.ts, value: Number(e.snap.stats.power_w) || 0 }))
      .sort((a, b) => a.ts - b.ts)
    return { metric, unit: 'W', deviceId: device.id, log }
  }

  // hashrate
  if (!pool) return { metric, unit: 'TH/s', log: [] }
  const tel = await services.mdkClient.pullTelemetry(pool.deviceId, {
    type: 'ext_data', key: 'stats-history', start, end
  })
  const entries = (tel && tel.extData) || []
  const log = (Array.isArray(entries) ? entries : [])
    .filter(e => e && Array.isArray(e.stats) && e.stats[0])
    .map(e => ({ ts: e.ts, value: Number(e.stats[0].hashrate) || 0 }))
    .sort((a, b) => a.ts - b.ts)
  return { metric, unit: 'TH/s', deviceId: pool.deviceId, log }
}
