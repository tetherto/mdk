'use strict'

const { loadSite } = require('../lib/site')

const ONE_HOUR_MS = 60 * 60 * 1000

// Historical time-series, both persisted by the real workers:
//   power       — site powermeter tail-log (telemetry.pull 'logs' on thing-5m)
//   temperature — Seneca sensor tail-log (snap.stats.temp_c)
//   hashrate    — pool stats-history (telemetry.pull 'ext_data' key 'stats-history'),
//                 the scheduler worker's persisted stats series.
module.exports = async function history (req, services) {
  const metric = (req.query && req.query.metric) || 'hashrate'
  if (metric !== 'hashrate' && metric !== 'power' && metric !== 'temperature') {
    throw new Error('ERR_UNKNOWN_METRIC')
  }

  const now = Date.now()
  const end = Number(req.query && req.query.end) || now
  const start = Number(req.query && req.query.start) || (end - ONE_HOUR_MS)
  if (start >= end) throw new Error('ERR_INVALID_DATE_RANGE')

  const { byFamily, pools } = await loadSite(services.mdkClient)

  if (metric === 'power') {
    const siteMeters = (byFamily['power-meter'] || []).filter((t) => t.info && t.info.pos === 'site')
    if (!siteMeters.length) return { metric, unit: 'W', log: [] }

    const deviceId = req.query && req.query.deviceId
    const meters = deviceId && deviceId !== 'site-aggregate'
      ? siteMeters.filter((t) => t.id === deviceId)
      : siteMeters
    if (deviceId && deviceId !== 'site-aggregate' && !meters.length) {
      throw new Error('ERR_UNKNOWN_DEVICE_ID')
    }

    const byTs = new Map()
    await Promise.all(meters.map(async (device) => {
      const tel = await services.mdkClient.pullTelemetry(device.id, {
        type: 'logs', key: 'thing-5m', tag: device.id, start, end, limit: 5000
      })
      for (const e of ((tel && tel.logs) || [])) {
        if (!e || !e.snap || !e.snap.stats) continue
        const value = Number(e.snap.stats.power_w) || 0
        byTs.set(e.ts, (byTs.get(e.ts) || 0) + value)
      }
    }))

    const log = [...byTs.entries()]
      .map(([ts, value]) => ({ ts, value }))
      .sort((a, b) => a.ts - b.ts)
    return {
      metric,
      unit: 'W',
      deviceId: deviceId && deviceId !== 'site-aggregate' ? deviceId : 'site-aggregate',
      log
    }
  }

  if (metric === 'temperature') {
    const sensors = byFamily.sensor || []
    if (!sensors.length) return { metric, unit: '°C', log: [] }

    const deviceId = req.query && req.query.deviceId
    const selected = deviceId && deviceId !== 'site-aggregate'
      ? sensors.filter((t) => t.id === deviceId)
      : sensors
    if (deviceId && deviceId !== 'site-aggregate' && !selected.length) {
      throw new Error('ERR_UNKNOWN_DEVICE_ID')
    }

    const byTs = new Map()
    const counts = new Map()
    await Promise.all(selected.map(async (device) => {
      const tel = await services.mdkClient.pullTelemetry(device.id, {
        type: 'logs', key: 'thing-5m', tag: device.id, start, end, limit: 5000
      })
      for (const e of ((tel && tel.logs) || [])) {
        if (!e || !e.snap || !e.snap.stats) continue
        const value = Number(e.snap.stats.temp_c) || 0
        byTs.set(e.ts, (byTs.get(e.ts) || 0) + value)
        counts.set(e.ts, (counts.get(e.ts) || 0) + 1)
      }
    }))

    const aggregate = deviceId == null || deviceId === 'site-aggregate'
    const log = [...byTs.entries()]
      .map(([ts, value]) => ({
        ts,
        value: aggregate && counts.get(ts) > 1 ? value / counts.get(ts) : value
      }))
      .sort((a, b) => a.ts - b.ts)
    return {
      metric,
      unit: '°C',
      deviceId: deviceId && deviceId !== 'site-aggregate' ? deviceId : 'site-aggregate',
      log
    }
  }

  // hashrate
  if (!pools.length) return { metric, unit: 'TH/s', log: [] }

  const deviceId = req.query && req.query.deviceId
  const selectedPools = deviceId
    ? pools.filter((p) => p.deviceId === deviceId)
    : pools
  if (deviceId && !selectedPools.length) throw new Error('ERR_UNKNOWN_DEVICE_ID')

  const byTs = new Map()
  await Promise.all(selectedPools.map(async (pool) => {
    const tel = await services.mdkClient.pullTelemetry(pool.deviceId, {
      type: 'ext_data', key: 'stats-history', start, end
    })
    const entries = (tel && tel.extData) || []
    for (const e of (Array.isArray(entries) ? entries : [])) {
      if (!e || !Array.isArray(e.stats) || !e.stats[0]) continue
      const value = Number(e.stats[0].hashrate) || 0
      byTs.set(e.ts, (byTs.get(e.ts) || 0) + value)
    }
  }))

  const log = [...byTs.entries()]
    .map(([ts, value]) => ({ ts, value }))
    .sort((a, b) => a.ts - b.ts)
  return {
    metric,
    unit: 'TH/s',
    deviceId: deviceId || 'site-aggregate',
    log
  }
}
