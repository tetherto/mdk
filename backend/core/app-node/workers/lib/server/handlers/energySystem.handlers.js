'use strict'

const { ENERGY_SYSTEM_PROJECTIONS } = require('../../constants')
const {
  isCentralDCSEnabled,
  getDCSTag,
  extractDcsThing,
  findEquipment
} = require('../../dcs.utils')

function getFieldProjection (view) {
  const base = ENERGY_SYSTEM_PROJECTIONS.base
  const viewProjection = ENERGY_SYSTEM_PROJECTIONS[view] || {}
  return { ...base, ...viewProjection }
}

function buildMinersView (equipment, config, stats) {
  const powerMeters = equipment.power_meters || []
  const energyStats = stats?.energy || {}

  // Site total from main meter (role: site_main)
  const siteMeter = powerMeters.find(pm => pm.role === 'site_main')
  const siteTotal = energyStats.site_total || {
    power_kw: siteMeter?.power?.value || 0,
    equipment: siteMeter?.equipment || null
  }

  // Rack meters (role: rack)
  console.log('powerMeters', powerMeters)
  const rackMeters = powerMeters
    .filter(pm => pm.role === 'rack')
    .sort((a, b) => {
      const numA = parseInt((a.equipment.match(/\d+/) || ['0'])[0], 10)
      const numB = parseInt((b.equipment.match(/\d+/) || ['0'])[0], 10)
      return numA - numB
    })

  return {
    title: 'Miners Energy',
    site_total: siteTotal,
    meters: rackMeters
  }
}

function buildCoolingAuxiliaryView (equipment, config) {
  const powerMeters = equipment.power_meters || []

  // CCM Principal (role: ccm_principal)
  const ccmMeter = powerMeters.find(pm => pm.role === 'ccm_principal')
  const ccmPrincipal = {
    power_kw: ccmMeter?.power?.value || 0,
    equipment: ccmMeter?.equipment || null
  }

  // Auxiliary meters (role: auxiliary)
  const auxiliaryMeters = powerMeters.filter(pm => pm.role === 'auxiliary')

  return {
    title: 'Cooling & Auxiliary',
    ccm_principal: ccmPrincipal,
    ccm_meter: ccmMeter || null,
    auxiliary_meters: auxiliaryMeters
  }
}

function buildLayoutView (equipment, config, stats) {
  const powerMeters = equipment.power_meters || []
  const protectionRelays = equipment.protection_relays || []
  const transformers = equipment.transformers || []
  const distributionBoards = equipment.distribution_boards || []
  const energyLayout = config?.energy_layout || {}
  const energyStats = stats?.energy || {}

  // Site main power meter (role: site_main)
  const siteMeter = powerMeters.find(pm => pm.role === 'site_main')

  // Main protection relay (role: main_incoming)
  const mainRelay = protectionRelays.find(r => r.role === 'main_incoming')

  // Build branches from config, looking up equipment by role/description
  const branches = (energyLayout.branches || []).map(branchConfig => {
    const relay = findEquipment(protectionRelays, branchConfig.relay)
    const transformer = findEquipment(transformers, branchConfig.transformer)
    const board = findEquipment(distributionBoards, branchConfig.board)
    const meter = findEquipment(powerMeters, branchConfig.meter)

    return {
      feeds: branchConfig.feeds,
      protection_relay: relay || null,
      transformer: transformer || null,
      distribution_board: board || null,
      meter: meter ? { equipment: meter.equipment, power: meter.power } : null
    }
  })

  // Fallback: if no branches config, group by branch_feeder role
  if (branches.length === 0) {
    const branchRelays = protectionRelays.filter(r => r.role === 'branch_feeder')
    branchRelays.forEach((relay, idx) => {
      const transformer = transformers[idx] || null
      const board = distributionBoards[idx] || null

      branches.push({
        feeds: relay.description || `Branch ${idx + 1}`,
        protection_relay: relay,
        transformer,
        distribution_board: board,
        meter: null
      })
    })
  }

  const siteTotal = energyStats.site_total || {
    power_kw: siteMeter?.power?.value || 0,
    equipment: siteMeter?.equipment || null
  }

  return {
    title: 'Energy Layout',
    site_total: siteTotal,
    site_pm: siteMeter || null,
    main_protection: mainRelay || null,
    branches,
    summary: {
      protection_relays_total: protectionRelays.length,
      protection_relays_tripped: protectionRelays.filter(r => r.is_tripped).length,
      transformers_total: transformers.length,
      distribution_boards_total: distributionBoards.length,
      distribution_boards_tripped: distributionBoards.filter(b => b.is_tripped).length
    }
  }
}

/**
 * Build energy view data from DCS snap
 */
function buildEnergyViewData (snap, view) {
  const equipment = snap.stats?.dcs_specific?.equipment || {}
  const config = snap.config || {}
  const stats = snap.stats || {}

  switch (view) {
    case 'miners':
      return buildMinersView(equipment, config, stats)
    case 'cooling_auxiliary':
      return buildCoolingAuxiliaryView(equipment, config)
    case 'layout':
      return buildLayoutView(equipment, config, stats)
    default:
      return null
  }
}

/**
 * GET /auth/dcs/energy-system
 */
async function getEnergySystemData (ctx, req) {
  if (!isCentralDCSEnabled(ctx)) {
    throw new Error('ERR_FEATURE_NOT_ENABLED')
  }

  const { view } = req.query

  const validViews = ['miners', 'cooling_auxiliary', 'layout']

  if (!view || !validViews.includes(view)) {
    throw new Error('ERR_INVALID_VIEW')
  }

  const dcsTag = getDCSTag(ctx)
  const fields = getFieldProjection(view)

  const payload = {
    query: { tags: { $in: [dcsTag] } },
    status: 1,
    fields
  }

  const rpcResults = await ctx.dataProxy.requestDataMap('listThings', payload)
  const dcsThing = extractDcsThing(rpcResults)

  if (!dcsThing) {
    throw new Error('ERR_DCS_DATA_NOT_FOUND')
  }

  const snap = dcsThing.last.snap
  const viewData = buildEnergyViewData(snap, view)

  if (!viewData) {
    throw new Error('ERR_VIEW_DATA_NOT_AVAILABLE')
  }

  return {
    view,
    data: viewData
  }
}

module.exports = {
  getEnergySystemData,
  buildEnergyViewData,
  buildMinersView,
  buildCoolingAuxiliaryView,
  buildLayoutView
}
