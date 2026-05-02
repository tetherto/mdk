'use strict'

const {
  extractKeyEntry,
  mhsToPhs,
  mhsToThs,
  mergeGroupedField,
  getGroupNumber
} = require('../../metrics.utils')
const {
  LOG_KEYS,
  WORKER_TYPES,
  WORKER_TAGS,
  EXPLORER_RACK_AGGR_FIELDS,
  EXPLORER_RACK_DEFAULT_LIMIT,
  EXPLORER_RACK_MAX_LIMIT,
  DCS_POWER_METER_FIELDS
} = require('../../constants')
const {
  isCentralDCSEnabled,
  getDCSTag,
  extractDcsThing
} = require('../../dcs.utils')

/**
 * Aggregates per-rack stats from tailLogMulti results across all orks.
 *
 * @param {Array} tailLogResults - Array of ork responses from tailLogMulti
 * @returns {Object} { hashrateByRack, powerByRack, efficiencyByRack }
 */
function aggregateRackStats (tailLogResults) {
  const stats = {
    hashrateByRack: {},
    powerByRack: {},
    efficiencyByRack: {}
  }

  for (const orkResult of tailLogResults) {
    const entry = extractKeyEntry(orkResult, 0)
    if (!entry) continue

    mergeGroupedField(stats.hashrateByRack, entry.hashrate_mhs_5m_pdu_rack_group_avg_aggr)
    mergeGroupedField(stats.powerByRack, entry.power_w_pdu_rack_group_sum_aggr)
    mergeGroupedField(stats.efficiencyByRack, entry.efficiency_w_ths_pdu_rack_group_avg_aggr, true)
  }

  return stats
}

/**
 * Builds a flat list of all racks from mining config, enriched with tailLog stats.
 *
 * @param {Object} miningConfig - DCS mining config (total_groups, racks_per_group, miners_per_rack)
 * @param {Object} rackStats - Per-rack stats from aggregateRackStats
 * @returns {Array} Array of rack objects
 */
function buildRackList (miningConfig, rackStats) {
  const totalGroups = miningConfig?.total_groups || 0
  const racksPerGroup = miningConfig?.racks_per_group || 4
  const minersPerRack = miningConfig?.miners_per_rack || 20
  const racks = []

  for (let g = 1; g <= totalGroups; g++) {
    const groupId = `group-${g}`
    const groupName = `Group ${g}`

    for (let r = 1; r <= racksPerGroup; r++) {
      const rackKey = `${groupId}_rack-${r}`
      const hashrateMhs = rackStats.hashrateByRack[rackKey] || 0
      const powerW = rackStats.powerByRack[rackKey] || 0
      const powerKw = Math.round(powerW / 10) / 100
      const hashrateThs = mhsToThs(hashrateMhs)
      const efficiency = hashrateThs > 0
        ? Math.round((powerW / hashrateThs) * 10) / 10
        : rackStats.efficiencyByRack[rackKey] || 0

      racks.push({
        id: rackKey,
        name: `Rack ${((g - 1) * racksPerGroup) + r}`,
        group: { id: groupId, name: groupName },
        miners_count: minersPerRack,
        efficiency: { value: efficiency, unit: 'W/TH/s' },
        hashrate: { value: mhsToPhs(hashrateMhs), unit: 'PH/s' },
        consumption: { value: powerKw, unit: 'kW' }
      })
    }
  }

  return racks
}

/**
 * Filters racks by group ids.
 *
 * @param {Array} racks - Array of rack objects
 * @param {Array<string>} groups - Group ids to filter by
 * @returns {Array} Filtered racks
 */
function filterByGroups (racks, groups) {
  const groupSet = new Set(groups)
  return racks.filter(rack => groupSet.has(rack.group.id))
}

/**
 * Filters racks by search string (matches rack name or id, group name or id, case-insensitive).
 *
 * @param {Array} racks - Array of rack objects
 * @param {string?} search - Search term
 * @returns {Array} Filtered racks
 */
function filterBySearch (racks, search) {
  const terms = search?.split(',')
    .map(term => term.trim().toLowerCase())
    .filter(Boolean)

  if (!terms?.length) {
    return racks
  }

  return racks.filter(rack => (
    terms.some(term => [
      rack.id,
      rack.name,
      rack.group?.id,
      rack.group?.name
    ].some(field => field?.toLowerCase().includes(term)))
  ))
}

/**
 * Sorts racks by the given sort spec.
 * Supported fields: efficiency, hashrate, consumption, name, group
 *
 * @param {Array} racks - Array of rack objects
 * @param {Object} sort - Sort spec: { field: 1 or -1 }
 * @returns {Array} Sorted racks (mutates the original)
 */
function sortRacks (racks, sort) {
  const entries = Object.entries(sort)
  if (entries.length === 0) return racks

  return racks.sort((a, b) => {
    for (const [field, direction] of entries) {
      let aVal, bVal
      if (field === 'efficiency' || field === 'hashrate' || field === 'consumption') {
        aVal = a[field]?.value
        bVal = b[field]?.value
      } else if (field === 'group') {
        aVal = getGroupNumber(a.group.id)
        bVal = getGroupNumber(b.group.id)
      } else if (field === 'name') {
        aVal = a.name
        bVal = b.name
      } else {
        continue
      }

      if (aVal === bVal) continue
      if (aVal == null) return direction
      if (bVal == null) return -direction
      if (aVal < bVal) return -direction
      if (aVal > bVal) return direction
    }
    return 0
  })
}

/**
 * GET /auth/explorer/racks
 *
 * Returns a paginated list of racks with per-rack stats.
 * Combines DCS mining config (rack structure) with tailLog RTD (per-rack hashrate/power/efficiency).
 *
 * Query params:
 *   group - comma-separated group ids to filter by (e.g. "group-2" or "group-1,group-3")
 *   search - text search on rack name/id
 *   sort - JSON sort spec (e.g. '{"efficiency":-1}')
 *   offset - pagination offset (default 0)
 *   limit - page size (default 20, max 100)
 */
async function listExplorerRacks (ctx, req) {
  const tailLogPayload = {
    keys: [
      { key: LOG_KEYS.STAT_RTD, type: WORKER_TYPES.MINER, tag: WORKER_TAGS.MINER }
    ],
    limit: 1,
    aggrFields: EXPLORER_RACK_AGGR_FIELDS
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

  const rackStats = aggregateRackStats(tailLogResults)
  const dcsThing = dcsResults ? extractDcsThing(dcsResults) : null
  const miningConfig = dcsThing?.last?.snap?.config?.mining || {}

  let racks = buildRackList(miningConfig, rackStats)

  if (req.query.group) {
    const groups = req.query.group.split(',').map(g => g.trim()).filter(Boolean)
    if (groups.length > 0) {
      racks = filterByGroups(racks, groups)
    }
  }

  racks = filterBySearch(racks, req.query.search)

  if (req.query.sort) {
    const sort = typeof req.query.sort === 'string' ? JSON.parse(req.query.sort) : req.query.sort
    sortRacks(racks, sort)
  }

  const offset = req.query.offset || 0
  const limit = Math.min(req.query.limit || EXPLORER_RACK_DEFAULT_LIMIT, EXPLORER_RACK_MAX_LIMIT)
  const totalCount = racks.length
  const page = racks.slice(offset, offset + limit)

  return {
    data: page,
    totalCount,
    offset,
    limit,
    hasMore: offset + limit < totalCount
  }
}

module.exports = {
  listExplorerRacks,
  aggregateRackStats,
  buildRackList,
  filterByGroups,
  filterBySearch,
  sortRacks
}
