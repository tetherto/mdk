'use strict'

const { loadSite, snapStats, snapConfig } = require('../lib/site')

function containerId (thg) {
  return (thg.info && thg.info.container) || thg.id || thg.code
}

function phase1CurrentA (powerSpecific) {
  if (!powerSpecific) return 0
  if (powerSpecific.i1_a != null) return Number(powerSpecific.i1_a) || 0
  const iv = powerSpecific.instantaneous_values
  if (!iv) return 0
  if (iv.current_i1_a != null) return Number(iv.current_i1_a) || 0
  if (iv.current_a_a != null) return Number(iv.current_a_a) || 0
  return 0
}

function aggregateSiteMeters (siteMeters) {
  let powerW = 0
  let currentA = 0
  let tensionSum = 0
  let tensionCount = 0
  for (const thg of siteMeters) {
    const s = snapStats(thg)
    powerW += Number(s.power_w) || 0
    currentA += phase1CurrentA(s.powermeter_specific)
    const tension = Number(s.tension_v) || 0
    if (tension > 0) {
      tensionSum += tension
      tensionCount++
    }
  }
  return {
    powerW,
    currentA,
    tensionV: tensionCount > 0 ? tensionSum / tensionCount : 0
  }
}

function powermeterLabel (thg) {
  const type = thg.type || ''
  if (type.includes('abb')) return 'ABB B23'
  if (type.includes('satec')) return 'SATEC PM180'
  if (type.includes('schneider')) return 'Schneider PM5340'
  return thg.code || thg.id
}

function mapPowermeter (thg) {
  const s = snapStats(thg)
  return {
    deviceId: thg.id,
    code: thg.code,
    type: thg.type,
    label: powermeterLabel(thg),
    powerW: Number(s.power_w) || 0,
    tensionV: Number(s.tension_v) || 0,
    currentA: phase1CurrentA(s.powermeter_specific)
  }
}

function sensorLabel (thg) {
  const type = thg.type || ''
  if (type.includes('seneca')) return 'Seneca'
  return thg.code || thg.id
}

function mapSensor (thg) {
  const s = snapStats(thg)
  return {
    deviceId: thg.id,
    container: (thg.info && thg.info.container) || '',
    label: sensorLabel(thg),
    tempC: Number(s.temp_c) || 0,
    status: s.status || 'unknown'
  }
}

async function mapPool (pool, mdkClient) {
  const tel = await mdkClient.pullTelemetry(pool.deviceId, { type: 'ext_data', key: 'stats' })
  const stats = (tel && tel.extData && tel.extData.stats) || []
  const p = stats[0]
  if (!p) return null
  return {
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

// Live site snapshot — all containers with linked miners, site power from the
// powermeter, sensors, and pools — all sourced via mdkClient over the RPC listener.
module.exports = async function overview (req, services) {
  const { byFamily, pools } = await loadSite(services.mdkClient, { status: true })

  const minerThings = byFamily.miner || []
  const containerThings = byFamily.container || []
  const siteMeters = (byFamily['power-meter'] || []).filter((t) => t.info && t.info.pos === 'site')
  const sensorThings = byFamily.sensor || []

  const sensors = sensorThings.map(mapSensor).sort((a, b) => a.container.localeCompare(b.container))
  const sensorByContainer = new Map(sensors.map((s) => [s.container, s.tempC]))

  const miners = minerThings.map((thg) => {
    const s = snapStats(thg)
    const c = snapConfig(thg)
    const hr = s.hashrate_mhs || {}
    const temp = s.temperature_c || {}
    return {
      deviceId: thg.id,
      code: thg.code,
      container: containerId(thg),
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

  const containerById = new Map()
  for (const thg of containerThings) {
    const id = containerId(thg)
    const s = snapStats(thg)
    containerById.set(id, {
      deviceId: thg.id,
      id,
      code: thg.code,
      operatingStatus: s.status || 'unknown',
      powerW: s.power_w || 0,
      ambientTempC: s.ambient_temp_c || 0,
      inletTempC: sensorByContainer.get(id) || 0,
      minerCount: 0
    })
  }

  // Ensure every container referenced by a miner appears (even if the container
  // worker has not reported telemetry yet).
  for (const m of miners) {
    if (!m.container) continue
    if (!containerById.has(m.container)) {
      containerById.set(m.container, {
        deviceId: m.container,
        id: m.container,
        code: m.container,
        operatingStatus: 'unknown',
        powerW: 0,
        ambientTempC: 0,
        inletTempC: sensorByContainer.get(m.container) || 0,
        minerCount: 0
      })
    }
  }

  const containers = [...containerById.values()]
    .map((c) => ({
      ...c,
      minerCount: miners.filter((m) => m.container === c.id).length
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const sitePower = aggregateSiteMeters(siteMeters)
  const powermeters = siteMeters.map(mapPowermeter).sort((a, b) => a.label.localeCompare(b.label))

  const poolData = (await Promise.all(pools.map((p) => mapPool(p, services.mdkClient))))
    .filter(Boolean)
    .sort((a, b) => a.poolType.localeCompare(b.poolType))

  return {
    ts: Date.now(),
    containers,
    site: {
      powerW: sitePower.powerW,
      tensionV: sitePower.tensionV,
      currentA: sitePower.currentA
    },
    powermeters,
    pools: poolData,
    sensors,
    miners,
    totals: {
      hashrateMhs: totals.hashrateMhs,
      powerW: totals.powerW,
      minerCount: miners.length,
      onlineCount: totals.onlineCount
    }
  }
}
