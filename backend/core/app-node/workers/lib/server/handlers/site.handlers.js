'use strict'

const {
  extractKeyEntry,
  mhsToPhs,
  mhsToThs,
  parseRackId,
  getGroupNumber,
  mergeGroupedField,
  buildGroupPowerFromDCS
} = require('../../metrics.utils')
const {
  LOG_KEYS,
  WORKER_TYPES,
  WORKER_TAGS,
  SITE_OVERVIEW_AGGR_FIELDS,
  DCS_POWER_METER_FIELDS,
  DCS_EFFICIENCY_FIELDS
} = require('../../constants')
const {
  isCentralDCSEnabled,
  getDCSTag,
  extractDcsThing
} = require('../../dcs.utils')

/**
 * Aggregates miner stats from tailLogMulti results across all orks.
 * Key index 0 = miner data (stat-rtd, type: miner)
 *
 * @param {Array} tailLogResults - Array of ork responses from tailLogMulti
 * @returns {Object} Aggregated miner stats
 */
function aggregateMinerStats (tailLogResults) {
  const stats = {
    hashrate: 0,
    nominalHashrate: 0,
    online: 0,
    error: 0,
    offline: 0,
    total: 0,
    alerts: { critical: 0, high: 0, medium: 0 }
  }

  for (const orkResult of tailLogResults) {
    const entry = extractKeyEntry(orkResult, 0)
    if (!entry) continue

    stats.hashrate += entry.hashrate_mhs_1m_sum_aggr || 0
    stats.nominalHashrate += entry.nominal_hashrate_mhs_sum_aggr || 0
    stats.online += entry.online_or_minor_error_miners_amount_aggr || 0
    stats.error += entry.not_mining_miners_amount_aggr || 0
    stats.offline += entry.offline_or_sleeping_miners_amount_aggr || 0
    stats.total += entry.hashrate_mhs_1m_cnt_aggr || 0

    const alerts = entry.alerts_aggr
    if (alerts && typeof alerts === 'object') {
      stats.alerts.critical += alerts.critical || 0
      stats.alerts.high += alerts.high || 0
      stats.alerts.medium += alerts.medium || 0
    }
  }

  return stats
}

/**
 * Extracts site power from powermeter tail-log results across all orks.
 * Key index 1 = powermeter data (stat-rtd, type: powermeter)
 *
 * @param {Array} tailLogResults - Array of ork responses from tailLogMulti
 * @returns {number} Total site power in Watts
 */
function aggregatePowerStats (tailLogResults) {
  let sitePower = 0

  for (const orkResult of tailLogResults) {
    const entry = extractKeyEntry(orkResult, 1)
    if (!entry) continue
    sitePower += entry.site_power_w || 0
  }

  return sitePower
}

/**
 * Extracts container capacity from container tail-log results across all orks.
 * Key index 2 = container data (stat-rtd, type: container)
 *
 * @param {Array} tailLogResults - Array of ork responses from tailLogMulti
 * @returns {number} Total container nominal miner capacity
 */
function aggregateContainerCapacity (tailLogResults) {
  let capacity = 0

  for (const orkResult of tailLogResults) {
    const entry = extractKeyEntry(orkResult, 2)
    if (!entry) continue
    capacity += entry.container_nominal_miner_capacity_sum_aggr || 0
  }

  return capacity
}

/**
 * Aggregates pool stats from ext-data minerpool results across all orks.
 *
 * @param {Array} poolDataResults - Array of ork responses from getWrkExtData
 * @returns {Object} Aggregated pool stats
 */
function aggregatePoolStats (poolDataResults) {
  const stats = {
    totalHashrate: 0,
    activeWorkers: 0,
    totalWorkers: 0
  }

  for (const orkResult of poolDataResults) {
    if (!Array.isArray(orkResult)) continue
    for (const pool of orkResult) {
      if (!pool || !pool.stats) continue
      stats.totalHashrate += pool.stats.hashrate || 0
      stats.activeWorkers += pool.stats.active_workers_count || 0
      stats.totalWorkers += pool.stats.worker_count || 0
    }
  }

  return stats
}

/**
 * Extracts nominal values from global config results.
 * Merges across orks (typically only 1 ork has global config).
 *
 * @param {Array} globalConfigResults - Array of ork responses from getGlobalConfig
 * @returns {Object} Nominal configuration values
 */
function extractGlobalConfig (globalConfigResults) {
  const config = {
    nominalHashrate: 0,
    nominalPowerAvailability_MW: 0
  }

  for (const orkResult of globalConfigResults) {
    if (!orkResult || typeof orkResult !== 'object') continue
    if (orkResult.nominalHashrate) { config.nominalHashrate = orkResult.nominalHashrate }
    if (orkResult.nominalPowerAvailability_MW) {
      config.nominalPowerAvailability_MW =
        orkResult.nominalPowerAvailability_MW
    }
  }

  return config
}

/**
 * Computes utilization percentage safely.
 *
 * @param {number} value - Current value
 * @param {number} nominal - Nominal/max value
 * @returns {number} Utilization percentage rounded to 1 decimal, or 0 if nominal is 0
 */
function computeUtilization (value, nominal) {
  if (!nominal || nominal === 0) return 0
  return Math.round((value / nominal) * 1000) / 10
}

/**
 * Composes the site live status response from all data sources.
 *
 * @param {Array} tailLogResults - tailLogMulti RPC results
 * @param {Array} poolDataResults - getWrkExtData (minerpool) RPC results
 * @param {Array} globalConfigResults - getGlobalConfig RPC results
 * @returns {Object} Composed site status response
 */
function composeSiteStatus (
  tailLogResults,
  poolDataResults,
  globalConfigResults
) {
  const minerStats = aggregateMinerStats(tailLogResults)
  const sitePower = aggregatePowerStats(tailLogResults)
  const containerCapacity = aggregateContainerCapacity(tailLogResults)
  const poolStats = aggregatePoolStats(poolDataResults)
  const globalConfig = extractGlobalConfig(globalConfigResults)

  const nominalPowerW = globalConfig.nominalPowerAvailability_MW * 1000000
  const hashrateNominal =
    minerStats.nominalHashrate || globalConfig.nominalHashrate || 0

  const hashrateValue = minerStats.hashrate
  const hashrateThs = hashrateValue / 1000000
  const efficiencyWPerTh =
    hashrateThs > 0 ? Math.round((sitePower / hashrateThs) * 10) / 10 : 0

  const sleep = Math.max(
    0,
    minerStats.total -
      minerStats.online -
      minerStats.error -
      minerStats.offline
  )
  const alertTotal =
    minerStats.alerts.critical +
    minerStats.alerts.high +
    minerStats.alerts.medium

  return {
    hashrate: {
      value: hashrateValue,
      nominal: hashrateNominal,
      utilization: computeUtilization(hashrateValue, hashrateNominal)
    },
    power: {
      value: sitePower,
      nominal: nominalPowerW,
      utilization: computeUtilization(sitePower, nominalPowerW)
    },
    efficiency: {
      value: efficiencyWPerTh
    },
    miners: {
      online: minerStats.online,
      offline: minerStats.offline,
      error: minerStats.error,
      sleep,
      total: minerStats.total,
      containerCapacity
    },
    alerts: {
      critical: minerStats.alerts.critical,
      high: minerStats.alerts.high,
      medium: minerStats.alerts.medium,
      total: alertTotal
    },
    pools: poolStats,
    ts: Date.now()
  }
}

/**
 * GET /auth/site/status/live
 *
 * Returns a composite site status snapshot by aggregating:
 * - tailLogMulti (miner hashrate/counts/alerts, powermeter power, container capacity)
 * - getWrkExtData (pool hashrate, worker counts)
 * - getGlobalConfig (nominal hashrate, nominal power availability)
 *
 * Replaces 5 separate frontend API calls with a single server-side composition.
 */
async function getSiteLiveStatus (ctx, req) {
  const tailLogPayload = {
    keys: [
      { key: 'stat-rtd', type: 'miner', tag: 't-miner' },
      { key: 'stat-rtd', type: 'powermeter', tag: 't-powermeter' },
      { key: 'stat-rtd', type: 'container', tag: 't-container' }
    ],
    limit: 1,
    aggrFields: {
      hashrate_mhs_1m_sum_aggr: 1,
      nominal_hashrate_mhs_sum_aggr: 1,
      alerts_aggr: 1,
      online_or_minor_error_miners_amount_aggr: 1,
      not_mining_miners_amount_aggr: 1,
      offline_or_sleeping_miners_amount_aggr: 1,
      hashrate_mhs_1m_cnt_aggr: 1,
      site_power_w: 1,
      container_nominal_miner_capacity_sum_aggr: 1
    }
  }

  const poolPayload = {
    type: 'minerpool',
    query: { key: 'stats' }
  }

  const globalConfigPayload = {
    fields: { nominalHashrate: 1, nominalPowerAvailability_MW: 1 }
  }

  const [tailLogResults, poolDataResults, globalConfigResults] =
    await Promise.all([
      ctx.dataProxy.requestDataMap('tailLogMulti', tailLogPayload),
      ctx.dataProxy.requestDataMap('getWrkExtData', poolPayload),
      ctx.dataProxy.requestDataMap('getGlobalConfig', globalConfigPayload)
    ])

  return composeSiteStatus(
    tailLogResults,
    poolDataResults,
    globalConfigResults
  )
}

function aggregateOverviewMinerStats (tailLogResults) {
  const aggregated = {
    hashrateByGroup: {},
    hashrateByRack: {},
    powerByGroup: {},
    powerByRack: {},
    efficiencyByGroup: {},
    efficiencyByRack: {},
    offlineByGroup: {},
    errorByGroup: {},
    notMiningByGroup: {},
    sleepByGroup: {},
    lowByGroup: {},
    normalByGroup: {},
    highByGroup: {},
    activeCountByGroup: {}
  }

  for (const orkResult of tailLogResults) {
    const entry = extractKeyEntry(orkResult, 0)
    if (!entry) continue

    mergeGroupedField(aggregated.hashrateByGroup, entry.hashrate_mhs_5m_container_group_sum_aggr)
    mergeGroupedField(aggregated.hashrateByRack, entry.hashrate_mhs_5m_pdu_rack_group_avg_aggr)
    mergeGroupedField(aggregated.powerByGroup, entry.power_w_container_group_sum_aggr)
    mergeGroupedField(aggregated.powerByRack, entry.power_w_pdu_rack_group_sum_aggr)
    mergeGroupedField(aggregated.efficiencyByGroup, entry.efficiency_w_ths_container_group_avg_aggr, true)
    mergeGroupedField(aggregated.efficiencyByRack, entry.efficiency_w_ths_pdu_rack_group_avg_aggr, true)
    mergeGroupedField(aggregated.offlineByGroup, entry.offline_cnt)
    mergeGroupedField(aggregated.errorByGroup, entry.error_cnt)
    mergeGroupedField(aggregated.notMiningByGroup, entry.not_mining_cnt)
    mergeGroupedField(aggregated.sleepByGroup, entry.power_mode_sleep_cnt)
    mergeGroupedField(aggregated.lowByGroup, entry.power_mode_low_cnt)
    mergeGroupedField(aggregated.normalByGroup, entry.power_mode_normal_cnt)
    mergeGroupedField(aggregated.highByGroup, entry.power_mode_high_cnt)
    mergeGroupedField(aggregated.activeCountByGroup, entry.hashrate_mhs_5m_active_container_group_cnt)
  }

  return aggregated
}

function buildRacksForGroup (groupName, minerStats, racksPerGroup) {
  const racks = []
  const rackKeys = Object.keys(minerStats.hashrateByRack)
    .filter(key => key.startsWith(groupName + '_'))
    .sort((a, b) => {
      const rackA = parseRackId(a)
      const rackB = parseRackId(b)
      if (!rackA || !rackB) return 0
      return rackA.rack.localeCompare(rackB.rack, undefined, { numeric: true })
    })

  for (const rackKey of rackKeys) {
    const parsed = parseRackId(rackKey)
    if (!parsed) continue

    const hashrateMhs = minerStats.hashrateByRack[rackKey] || 0
    const powerW = minerStats.powerByRack[rackKey] || 0
    const powerKw = Math.round(powerW / 10) / 100 // W to kW with 2 decimals
    const hashrateThs = mhsToThs(hashrateMhs)
    const efficiency = hashrateThs > 0
      ? Math.round((powerW / hashrateThs) * 10) / 10
      : minerStats.efficiencyByRack[rackKey] || 0

    racks.push({
      id: parsed.rack,
      name: `Rack ${parsed.rack}`,
      efficiency: { value: efficiency, unit: 'W/TH/s' },
      consumption: { value: powerKw, unit: 'kW' },
      hashrate: { value: mhsToPhs(hashrateMhs), unit: 'PH/s' }
    })
  }

  return racks
}

function getMinersPerGroup (miningConfig) {
  const racksPerGroup = miningConfig?.racks_per_group || 4
  const minersPerRack = miningConfig?.miners_per_rack || 20
  return racksPerGroup * minersPerRack
}

function composeGroupsStats (minerStats, dcsThing, totalGroups) {
  const groups = []
  const config = dcsThing?.last?.snap?.config || {}
  const miningConfig = config.mining || {}
  const energyLayout = config.energy_layout || {}
  const powerMeters = dcsThing?.last?.snap?.stats?.dcs_specific?.equipment?.power_meters || []
  const racksPerGroup = miningConfig?.racks_per_group || 4
  const minersPerGroup = getMinersPerGroup(miningConfig)

  const dcsPowerByGroup = buildGroupPowerFromDCS(
    powerMeters,
    minerStats.hashrateByGroup,
    energyLayout,
    miningConfig
  )

  const groupNames = Object.keys(minerStats.hashrateByGroup)
    .filter(name => name.startsWith('group-'))
    .sort((a, b) => getGroupNumber(a) - getGroupNumber(b))

  const maxGroups = totalGroups || groupNames.length
  for (let i = 1; i <= maxGroups; i++) {
    const groupName = `group-${i}`

    const hashrateMhs = minerStats.hashrateByGroup[groupName] || 0
    const powerKw = dcsPowerByGroup[groupName]
      ? Math.round(dcsPowerByGroup[groupName] * 100) / 100
      : Math.round((minerStats.powerByGroup[groupName] || 0) / 10) / 100 // W to kW

    const hashrateThs = mhsToThs(hashrateMhs)
    const efficiency = hashrateThs > 0
      ? Math.round(((powerKw * 1000) / hashrateThs) * 10) / 10
      : minerStats.efficiencyByGroup[groupName] || 0

    const offline = minerStats.offlineByGroup[groupName] || 0
    const error = minerStats.errorByGroup[groupName] || 0
    const sleep = minerStats.sleepByGroup[groupName] || 0
    const low = minerStats.lowByGroup[groupName] || 0
    const normal = minerStats.normalByGroup[groupName] || 0
    const high = minerStats.highByGroup[groupName] || 0
    const notMining = minerStats.notMiningByGroup[groupName] || 0
    const totalMiners = offline + error + sleep + low + normal + high + notMining
    const empty = Math.max(0, minersPerGroup - totalMiners)

    const racks = buildRacksForGroup(groupName, minerStats, racksPerGroup)

    groups.push({
      id: groupName,
      name: `Group ${i}`,
      summary: {
        efficiency: { value: efficiency, unit: 'W/TH/s' },
        consumption: { value: powerKw, unit: 'kW' },
        hashrate: { value: mhsToPhs(hashrateMhs), unit: 'PH/s' }
      },
      racks,
      status: {
        offline,
        error,
        sleep,
        low,
        normal,
        high,
        empty,
        not_mining: notMining,
        total: totalMiners
      }
    })
  }

  return { groups }
}

/**
 * GET /auth/site/overview/groups
 *
 * Returns group-level stats combining:
 * - Miner stats from tailLog (hashrate, efficiency, status counts per group/rack)
 * - DCS power meter data for consumption
 */
async function getSiteOverviewGroupsStats (ctx, req) {
  const tailLogPayload = {
    keys: [
      { key: LOG_KEYS.STAT_RTD, type: WORKER_TYPES.MINER, tag: WORKER_TAGS.MINER }
    ],
    limit: 1,
    aggrFields: SITE_OVERVIEW_AGGR_FIELDS
  }

  const dcsEnabled = isCentralDCSEnabled(ctx)
  let dcsPayload = null
  if (dcsEnabled) {
    const dcsTag = getDCSTag(ctx)
    dcsPayload = {
      query: { tags: { $in: [dcsTag] } },
      status: 1,
      fields: { id: 1, code: 1, type: 1, tags: 1, ...DCS_POWER_METER_FIELDS }
    }
  }

  const [tailLogResults, dcsResults] = await Promise.all([
    ctx.dataProxy.requestDataMap('tailLogMulti', tailLogPayload),
    dcsEnabled ? ctx.dataProxy.requestDataMap('listThings', dcsPayload) : Promise.resolve(null)
  ])

  const minerStats = aggregateOverviewMinerStats(tailLogResults)

  const dcsThing = dcsResults ? extractDcsThing(dcsResults) : null

  const totalGroups = dcsThing?.last?.snap?.config?.mining?.total_groups || null

  return composeGroupsStats(minerStats, dcsThing, totalGroups)
}

function composeSiteEfficiency (minerStats, dcsThing) {
  const config = dcsThing?.last?.snap?.config || {}
  const miningConfig = config.mining || {}
  const energyLayout = config.energy_layout || {}
  const powerMeters = dcsThing?.last?.snap?.stats?.dcs_specific?.equipment?.power_meters || []
  const distributionBoards = dcsThing?.last?.snap?.stats?.dcs_specific?.equipment?.distribution_boards || []
  const transformers = dcsThing?.last?.snap?.stats?.dcs_specific?.equipment?.transformers || []
  const branches = energyLayout.branches || []

  const minersPerGroup = (miningConfig.racks_per_group || 4) * (miningConfig.miners_per_rack || 20)
  const siteMeter = powerMeters.find(pm => pm.equipment === energyLayout.site_meter) || powerMeters.find(pm => pm.role === 'site_main')
  const siteTotalKw = siteMeter?.power?.value || 0
  const powerUnit = siteMeter?.power?.unit

  const efficiencyPerMeter = []
  let totalMiningPowerKw = 0
  let totalHashrateMhs = 0

  for (const branch of branches) {
    const meter = powerMeters.find(pm => pm.equipment === branch.meter)
    if (!meter || meter.role !== 'rack') continue

    const meterPower = meter.power?.value || 0
    const coveredGroups = []
    const feedsMatch = branch.feeds?.match(/Groups?\s+(\d+)-(\d+)/i)
    if (feedsMatch) {
      const start = parseInt(feedsMatch[1], 10)
      const end = parseInt(feedsMatch[2], 10)
      for (let i = start; i <= end; i++) {
        coveredGroups.push(`group-${i}`)
      }
    }

    let branchHashrateMhs = 0
    for (const groupName of coveredGroups) {
      branchHashrateMhs += minerStats.hashrateByGroup[groupName] || 0
    }

    const branchHashrateThs = mhsToThs(branchHashrateMhs)
    const efficiency = branchHashrateThs > 0
      ? Math.round(((meterPower * 1000) / branchHashrateThs) * 100) / 100
      : 0

    totalMiningPowerKw += meterPower
    totalHashrateMhs += branchHashrateMhs

    const board = distributionBoards.find(db => db.equipment === branch.board)
    const transformer = transformers.find(tr => tr.equipment === branch.transformer)

    efficiencyPerMeter.push({
      board: branch.board,
      board_name: board?.name || branch.board,
      transformer: branch.transformer,
      transformer_name: transformer?.name || branch.transformer,
      feeds: branch.feeds,
      meter: branch.meter,
      efficiency: { value: efficiency, unit: 'W/THs' },
      power: { value: Math.round(meterPower * 10) / 10, unit: powerUnit },
      hashrate: { value: mhsToPhs(branchHashrateMhs), unit: 'PH/s' },
      miners: coveredGroups.length * minersPerGroup
    })
  }

  // Site-level efficiency
  const totalHashrateThs = mhsToThs(totalHashrateMhs)
  const siteEfficiency = totalHashrateThs > 0
    ? Math.round(((siteTotalKw * 1000) / totalHashrateThs) * 100) / 100
    : 0
  const miningEfficiency = totalHashrateThs > 0
    ? Math.round(((totalMiningPowerKw * 1000) / totalHashrateThs) * 100) / 100
    : 0

  // C&A overhead
  const ccmBranch = branches.find(b => b.feeds && !b.feeds.match(/Groups?\s+/i))
  const ccmMeter = ccmBranch ? powerMeters.find(pm => pm.equipment === ccmBranch.meter) : null
  const ccmPowerKw = ccmMeter?.power?.value || 0
  const caOverhead = siteTotalKw > 0
    ? Math.round((ccmPowerKw / siteTotalKw) * 1000) / 10
    : 0

  // Consumption breakdown
  const consumptionBreakdown = []

  if (siteMeter) {
    consumptionBreakdown.push({
      source: siteMeter.name || siteMeter.equipment,
      board: null,
      meter: siteMeter.equipment,
      consumption: { value: Math.round(siteTotalKw * 10) / 10, unit: powerUnit },
      percent: 100
    })
  }

  for (const branch of branches) {
    const meter = powerMeters.find(pm => pm.equipment === branch.meter)
    if (!meter) continue
    const meterPower = meter.power?.value || 0
    consumptionBreakdown.push({
      source: branch.board,
      board: branch.board,
      feeds: branch.feeds,
      meter: branch.meter,
      consumption: { value: Math.round(meterPower * 10) / 10, unit: powerUnit },
      percent: siteTotalKw > 0 ? Math.round((meterPower / siteTotalKw) * 1000) / 10 : 0
    })
  }

  return {
    summary: {
      site_efficiency: { value: siteEfficiency, unit: 'W/THs' },
      mining_efficiency: { value: miningEfficiency, unit: 'W/THs' },
      total_consumption: { value: Math.round((siteTotalKw / 1000) * 1000) / 1000, unit: 'MW' },
      ca_overhead: { value: caOverhead, unit: '%' }
    },
    efficiency_per_meter: efficiencyPerMeter,
    consumption_breakdown: consumptionBreakdown
  }
}

/**
 * GET /auth/site/efficiency
 *
 * Returns site efficiency metrics combining:
 * - Miner hashrate stats from tailLog (per group)
 * - DCS power meters, distribution boards, transformers for branch-level power
 */
async function getSiteEfficiency (ctx, req) {
  const tailLogPayload = {
    keys: [
      { key: LOG_KEYS.STAT_RTD, type: WORKER_TYPES.MINER, tag: WORKER_TAGS.MINER }
    ],
    limit: 1,
    aggrFields: SITE_OVERVIEW_AGGR_FIELDS
  }

  const dcsEnabled = isCentralDCSEnabled(ctx)
  let dcsPayload = null
  if (dcsEnabled) {
    const dcsTag = getDCSTag(ctx)
    dcsPayload = {
      query: { tags: { $in: [dcsTag] } },
      status: 1,
      fields: { id: 1, code: 1, type: 1, tags: 1, ...DCS_EFFICIENCY_FIELDS }
    }
  }

  const [tailLogResults, dcsResults] = await Promise.all([
    ctx.dataProxy.requestDataMap('tailLogMulti', tailLogPayload),
    dcsEnabled ? ctx.dataProxy.requestDataMap('listThings', dcsPayload) : Promise.resolve(null)
  ])

  const minerStats = aggregateOverviewMinerStats(tailLogResults)
  const dcsThing = dcsResults ? extractDcsThing(dcsResults) : null

  if (!dcsThing) {
    throw new Error('ERR_DCS_DATA_NOT_FOUND')
  }

  return composeSiteEfficiency(minerStats, dcsThing)
}

module.exports = {
  getSiteLiveStatus,
  getSiteOverviewGroupsStats,
  getSiteEfficiency
}
