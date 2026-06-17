'use strict'

const { loadSite, snapStats, snapConfig } = require('../lib/site')

// Live site snapshot — the container with its linked miners, site power from the
// powermeter, and the pool — all sourced via mdkClient over the RPC gateway and
// shaped from the real worker telemetry contracts:
//   miner       stats.{status, power_w, hashrate_mhs.t_5m, temperature_c.avg} + config.power_mode
//   container   stats.{status, power_w, ambient_temp_c}
//   powermeter  stats.{power_w, tension_v, powermeter_specific.*}
//   pool        ext_data 'stats' → statsData.stats[0] (scheduler worker, no things)
module.exports = async function overview (req, services) {
  const { byFamily, pool } = await loadSite(services.mdkClient, { status: true })

  const minerThings = byFamily.miner || []
  const containerThing = (byFamily.container || [])[0]
  const powerThing = (byFamily['power-meter'] || [])[0]

  const miners = minerThings.map((thg) => {
    const s = snapStats(thg)
    const c = snapConfig(thg)
    const hr = s.hashrate_mhs || {}
    const temp = s.temperature_c || {}
    return {
      deviceId: thg.id,
      code: thg.code,
      container: thg.info && thg.info.container,
      pos: thg.info && thg.info.pos,
      status: s.status || 'unknown',
      powerMode: c.power_mode || null,
      hashrateMhs: hr.t_5m || hr.avg || 0,
      powerW: s.power_w || 0,
      temperature: temp.avg || 0
    }
  })

  const totals = miners.reduce((acc, m) => {
    acc.hashrateMhs += m.hashrateMhs
    acc.powerW += m.powerW
    if (m.status === 'mining' || m.status === 'sleeping') acc.onlineCount++
    return acc
  }, { hashrateMhs: 0, powerW: 0, onlineCount: 0 })

  const containerStats = snapStats(containerThing)
  const powerStats = snapStats(powerThing)
  const powerSpecific = powerStats.powermeter_specific || {}

  let poolData = null
  if (pool) {
    const tel = await services.mdkClient.pullTelemetry(pool.deviceId, { type: 'ext_data', key: 'stats' })
    const stats = (tel && tel.extData && tel.extData.stats) || []
    const p = stats[0]
    if (p) {
      poolData = {
        deviceId: pool.deviceId,
        name: p.username || pool.workerId,
        poolType: p.poolType || 'ocean',
        status: 'online',
        hashrate: p.hashrate || 0,
        hashrate24h: p.hashrate_24h || 0,
        workersOnline: p.active_workers_count != null ? p.active_workers_count : (p.worker_count || 0),
        balanceBtc: p.balance || 0,
        revenue24hBtc: p.revenue_24h || 0
      }
    }
  }

  return {
    ts: Date.now(),
    container: containerThing
      ? {
          deviceId: containerThing.id,
          id: (containerThing.info && containerThing.info.container) || containerThing.code,
          operatingStatus: containerStats.status || 'unknown',
          powerW: containerStats.power_w || 0,
          ambientTempC: containerStats.ambient_temp_c || 0
        }
      : null,
    site: {
      powerW: powerStats.power_w || 0,
      tensionV: powerStats.tension_v || 0,
      currentA: powerSpecific.i1_a || 0
    },
    pool: poolData,
    miners,
    totals: {
      hashrateMhs: totals.hashrateMhs,
      powerW: totals.powerW,
      minerCount: miners.length,
      onlineCount: totals.onlineCount
    }
  }
}
