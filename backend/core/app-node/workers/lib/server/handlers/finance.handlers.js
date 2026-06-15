'use strict'

const {
  WORKER_TYPES,
  AGGR_FIELDS,
  PERIOD_TYPES,
  MINERPOOL_EXT_DATA_KEYS,
  RPC_METHODS,
  GLOBAL_DATA_TYPES
} = require('../../constants')
const { getStartOfDay, safeDiv, runParallel } = require('../../utils')
const { aggregateByPeriod } = require('../../period.utils')
const {
  validateStartEnd,
  normalizeTimestampMs,
  processTransactions,
  extractCurrentPrice,
  processBlockData
} = require('./finance.utils')

// ==================== Energy Balance ====================

async function getEnergyBalance (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.DAILY

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const [
    consumptionResults,
    transactionResults,
    priceResults,
    currentPriceResults,
    productionCosts,
    activeEnergyInResults,
    uteEnergyResults,
    globalConfigResults
  ] = await runParallel([
    (cb) => ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
      keys: [{
        type: WORKER_TYPES.POWERMETER,
        startDate,
        endDate,
        fields: { [AGGR_FIELDS.SITE_POWER]: 1 },
        shouldReturnDailyData: 1
      }]
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MINERPOOL,
      query: { key: MINERPOOL_EXT_DATA_KEYS.TRANSACTIONS, start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'HISTORICAL_PRICES', start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'current_price' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => getProductionCosts(ctx, start, end)
      .then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.ELECTRICITY,
      query: { key: 'stats-history', start, end, groupRange: '1D' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.ELECTRICITY,
      query: { key: 'stats-history', start, end, groupRange: '1D' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GLOBAL_CONFIG, {})
      .then(r => cb(null, r)).catch(cb)
  ])

  const dailyConsumption = processConsumptionData(consumptionResults)
  const dailyTransactions = processTransactions(transactionResults)
  const dailyPrices = processPriceData(priceResults)
  const currentBtcPrice = extractCurrentPrice(currentPriceResults)
  const costsByMonth = processCostsData(productionCosts)
  const dailyActiveEnergyIn = processEnergyData(activeEnergyInResults, AGGR_FIELDS.ACTIVE_ENERGY_IN)
  const dailyUteEnergy = processEnergyData(uteEnergyResults, AGGR_FIELDS.UTE_ENERGY)
  const nominalPowerMW = extractNominalPower(globalConfigResults)

  const allDays = new Set([
    ...Object.keys(dailyConsumption),
    ...Object.keys(dailyTransactions)
  ])

  const log = []
  for (const dayTs of [...allDays].sort()) {
    const ts = Number(dayTs)
    const consumption = dailyConsumption[dayTs] || {}
    const transactions = dailyTransactions[dayTs] || {}
    const btcPrice = dailyPrices[dayTs] || currentBtcPrice || 0

    const powerW = consumption.powerW || 0
    const powerMWh = (powerW * 24) / 1000000
    const sitePowerMW = powerW / 1000000
    const revenueBTC = transactions.revenueBTC || 0
    const revenueUSD = revenueBTC * btcPrice

    const monthKey = `${new Date(ts).getFullYear()}-${String(new Date(ts).getMonth() + 1).padStart(2, '0')}`
    const costs = costsByMonth[monthKey] || {}
    const energyCostUSD = costs.energyCostPerDay || 0
    const totalCostUSD = energyCostUSD + (costs.operationalCostPerDay || 0)

    const activeEnergyIn = dailyActiveEnergyIn[dayTs] || 0
    const uteEnergy = dailyUteEnergy[dayTs] || 0
    const consumptionMWh = powerMWh

    const curtailmentMWh = activeEnergyIn > 0
      ? activeEnergyIn - consumptionMWh
      : null
    const curtailmentRate = curtailmentMWh !== null
      ? safeDiv(curtailmentMWh, consumptionMWh)
      : null

    const operationalIssuesRate = uteEnergy > 0
      ? safeDiv(uteEnergy - consumptionMWh, uteEnergy)
      : null

    const actualPowerMW = powerW / 1000000
    const powerUtilization = nominalPowerMW > 0
      ? safeDiv(actualPowerMW, nominalPowerMW)
      : null

    log.push({
      ts,
      powerW,
      sitePowerMW,
      consumptionMWh,
      revenueBTC,
      revenueUSD,
      btcPrice,
      energyCostUSD,
      totalCostUSD,
      energyRevenuePerMWh: safeDiv(revenueUSD, powerMWh),
      allInCostPerMWh: safeDiv(totalCostUSD, powerMWh),
      profitUSD: revenueUSD - totalCostUSD,
      curtailmentMWh,
      curtailmentRate,
      operationalIssuesRate,
      powerUtilization
    })
  }

  const aggregated = aggregateByPeriod(log, period, [], {
    meanKeys: ['sitePowerMW', 'btcPrice', 'curtailmentRate', 'operationalIssuesRate', 'powerUtilization']
  })

  for (const entry of aggregated) {
    entry.energyRevenueBTC_MW = entry.sitePowerMW > 0 ? entry.revenueBTC / entry.sitePowerMW : 0
    entry.energyRevenueUSD_MW = entry.sitePowerMW > 0 ? entry.revenueUSD / entry.sitePowerMW : 0
  }
  aggregated.sort((a, b) => Number(a.ts) - Number(b.ts))

  const summary = calculateSummary(aggregated)

  return { log: aggregated, summary }
}

function processConsumptionData (results) {
  const daily = {}
  for (const res of results) {
    if (res.error || !res) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry || entry.error) continue
      const items = entry.data || entry.items || entry
      if (Array.isArray(items)) {
        for (const item of items) {
          const ts = getStartOfDay(item.ts || item.timestamp)
          if (!ts) continue
          if (!daily[ts]) daily[ts] = { powerW: 0 }
          const val = item.val || item
          daily[ts].powerW += (val[AGGR_FIELDS.SITE_POWER] || val.site_power_w || 0)
        }
      } else if (typeof items === 'object') {
        for (const [key, val] of Object.entries(items)) {
          const ts = getStartOfDay(Number(key))
          if (!ts) continue
          if (!daily[ts]) daily[ts] = { powerW: 0 }
          const power = typeof val === 'object' ? (val[AGGR_FIELDS.SITE_POWER] || val.site_power_w || 0) : (Number(val) || 0)
          daily[ts].powerW += power
        }
      }
    }
  }
  return daily
}

function processPriceData (results) {
  const daily = {}
  for (const res of results) {
    if (res.error || !res) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const rawTs = entry.ts || entry.timestamp || entry.time
      const ts = getStartOfDay(normalizeTimestampMs(rawTs))
      const price = entry.priceUSD || entry.price
      if (ts && price) {
        daily[ts] = price
      }
    }
  }
  return daily
}

function processEnergyData (results, aggrField) {
  const daily = {}
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const items = Array.isArray(entry) ? entry : (entry.data || entry)
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item) continue
          const ts = getStartOfDay(item.ts || item.timestamp)
          if (!ts) continue
          const energyAggr = item[AGGR_FIELDS.ENERGY_AGGR]
          if (energyAggr && energyAggr[aggrField]) {
            daily[ts] = (daily[ts] || 0) + Number(energyAggr[aggrField])
          }
        }
      }
    }
  }
  return daily
}

function extractNominalPower (results) {
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : [res]
    for (const entry of data) {
      if (!entry) continue
      if (entry.nominalPowerAvailability_MW) return entry.nominalPowerAvailability_MW
    }
  }
  return 0
}

function calculateSummary (log) {
  if (!log.length) {
    return {
      totalRevenueBTC: 0,
      totalRevenueUSD: 0,
      totalCostUSD: 0,
      totalProfitUSD: 0,
      avgCostPerMWh: null,
      avgEnergyCostPerMWh: null,
      avgOperationalCostPerMWh: null,
      avgRevenuePerMWh: null,
      avgPowerConsumption: 0,
      totalConsumptionMWh: 0,
      avgCurtailmentRate: null,
      avgOperationalIssuesRate: null,
      avgPowerUtilization: null
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.revenueBTC += entry.revenueBTC || 0
    acc.revenueUSD += entry.revenueUSD || 0
    acc.energyCostUSD += entry.energyCostUSD || 0
    acc.costUSD += entry.totalCostUSD || 0
    acc.profitUSD += entry.profitUSD || 0
    acc.consumptionMWh += entry.consumptionMWh || 0
    if (entry.sitePowerMW !== null && entry.sitePowerMW !== undefined) {
      acc.sitePowerMWSum += entry.sitePowerMW
      acc.sitePowerMWCount++
    }
    if (entry.curtailmentRate !== null && entry.curtailmentRate !== undefined) {
      acc.curtailmentRateSum += entry.curtailmentRate
      acc.curtailmentRateCount++
    }
    if (entry.operationalIssuesRate !== null && entry.operationalIssuesRate !== undefined) {
      acc.operationalIssuesRateSum += entry.operationalIssuesRate
      acc.operationalIssuesRateCount++
    }
    if (entry.powerUtilization !== null && entry.powerUtilization !== undefined) {
      acc.powerUtilizationSum += entry.powerUtilization
      acc.powerUtilizationCount++
    }
    return acc
  }, {
    revenueBTC: 0,
    revenueUSD: 0,
    energyCostUSD: 0,
    costUSD: 0,
    profitUSD: 0,
    consumptionMWh: 0,
    sitePowerMWSum: 0,
    sitePowerMWCount: 0,
    curtailmentRateSum: 0,
    curtailmentRateCount: 0,
    operationalIssuesRateSum: 0,
    operationalIssuesRateCount: 0,
    powerUtilizationSum: 0,
    powerUtilizationCount: 0
  })

  return {
    totalRevenueBTC: totals.revenueBTC,
    totalRevenueUSD: totals.revenueUSD,
    totalCostUSD: totals.costUSD,
    totalProfitUSD: totals.profitUSD,
    avgCostPerMWh: safeDiv(totals.costUSD, totals.consumptionMWh),
    avgEnergyCostPerMWh: safeDiv(totals.energyCostUSD, totals.consumptionMWh),
    avgOperationalCostPerMWh: safeDiv(totals.costUSD - totals.energyCostUSD, totals.consumptionMWh),
    avgRevenuePerMWh: safeDiv(totals.revenueUSD, totals.consumptionMWh),
    avgPowerConsumption: safeDiv(totals.sitePowerMWSum, totals.sitePowerMWCount),
    totalConsumptionMWh: totals.consumptionMWh,
    avgCurtailmentRate: safeDiv(totals.curtailmentRateSum, totals.curtailmentRateCount),
    avgOperationalIssuesRate: safeDiv(totals.operationalIssuesRateSum, totals.operationalIssuesRateCount),
    avgPowerUtilization: safeDiv(totals.powerUtilizationSum, totals.powerUtilizationCount)
  }
}

// ==================== EBITDA ====================

async function getEbitda (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.MONTHLY

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const [transactionResults, tailLogResults, priceResults, currentPriceResults, productionCosts] = await runParallel([
    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MINERPOOL,
      query: { key: MINERPOOL_EXT_DATA_KEYS.TRANSACTIONS, start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
      keys: [
        {
          type: WORKER_TYPES.POWERMETER,
          startDate,
          endDate,
          fields: { [AGGR_FIELDS.SITE_POWER]: 1 },
          shouldReturnDailyData: 1
        },
        {
          type: WORKER_TYPES.MINER,
          startDate,
          endDate,
          fields: { [AGGR_FIELDS.HASHRATE_SUM]: 1 },
          shouldReturnDailyData: 1
        }
      ]
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'prices', start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'current_price' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => getProductionCosts(ctx, start, end)
      .then(r => cb(null, r)).catch(cb)
  ])

  const dailyTransactions = processTransactions(transactionResults)
  const dailyTailLog = processTailLogData(tailLogResults)
  const dailyPrices = processEbitdaPrices(priceResults)
  const currentBtcPrice = extractCurrentPrice(currentPriceResults)
  const costsByMonth = processCostsData(productionCosts)

  const allDays = new Set([
    ...Object.keys(dailyTransactions),
    ...Object.keys(dailyTailLog)
  ])

  const log = []
  for (const dayTs of [...allDays].sort()) {
    const ts = Number(dayTs)
    const transactions = dailyTransactions[dayTs] || {}
    const tailLog = dailyTailLog[dayTs] || {}
    const btcPrice = dailyPrices[dayTs] || currentBtcPrice || 0

    const revenueBTC = transactions.revenueBTC || 0
    const revenueUSD = revenueBTC * btcPrice
    const powerW = tailLog.powerW || 0
    const hashrateMhs = tailLog.hashrateMhs || 0
    const powerMWh = (powerW * 24) / 1000000

    const monthKey = `${new Date(ts).getFullYear()}-${String(new Date(ts).getMonth() + 1).padStart(2, '0')}`
    const costs = costsByMonth[monthKey] || {}
    const energyCostsUSD = costs.energyCostPerDay || 0
    const operationalCostsUSD = costs.operationalCostPerDay || 0
    const totalCostsUSD = energyCostsUSD + operationalCostsUSD

    const ebitdaSelling = revenueUSD - totalCostsUSD
    const ebitdaHodl = (revenueBTC * currentBtcPrice) - totalCostsUSD
    const btcProductionCost = safeDiv(totalCostsUSD, revenueBTC)

    log.push({
      ts,
      revenueBTC,
      revenueUSD,
      btcPrice,
      powerW,
      hashrateMhs,
      consumptionMWh: powerMWh,
      energyCostsUSD,
      operationalCostsUSD,
      totalCostsUSD,
      ebitdaSelling,
      ebitdaHodl,
      btcProductionCost
    })
  }

  const aggregated = aggregateByPeriod(log, period)
  const summary = calculateEbitdaSummary(aggregated, currentBtcPrice)

  return { log: aggregated, summary }
}

function processTailLogData (results) {
  const daily = {}
  for (const res of results) {
    if (res.error || !res) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const items = entry.data || entry.items || entry
      if (typeof items === 'object' && !Array.isArray(items)) {
        for (const [key, val] of Object.entries(items)) {
          const ts = getStartOfDay(Number(key))
          if (!daily[ts]) daily[ts] = { powerW: 0, hashrateMhs: 0 }
          if (typeof val === 'object') {
            daily[ts].powerW += (val[AGGR_FIELDS.SITE_POWER] || 0)
            daily[ts].hashrateMhs += (val[AGGR_FIELDS.HASHRATE_SUM] || 0)
          }
        }
      } else if (Array.isArray(items)) {
        for (const item of items) {
          const ts = getStartOfDay(item.ts || item.timestamp)
          if (!daily[ts]) daily[ts] = { powerW: 0, hashrateMhs: 0 }
          const val = item.val || item
          daily[ts].powerW += (val[AGGR_FIELDS.SITE_POWER] || 0)
          daily[ts].hashrateMhs += (val[AGGR_FIELDS.HASHRATE_SUM] || 0)
        }
      }
    }
  }
  return daily
}

function processEbitdaPrices (results) {
  const daily = {}
  for (const res of results) {
    if (res.error || !res) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const rawTs = entry.ts || entry.timestamp || entry.time
      const items = rawTs ? [entry] : (entry.data || entry.prices || entry)
      if (Array.isArray(items)) {
        for (const item of items) {
          const ts = getStartOfDay(item.ts || item.timestamp || item.time)
          const price = item.priceUSD || item.price
          if (ts && price) {
            daily[ts] = price
          }
        }
      } else if (typeof items === 'object') {
        for (const [key, val] of Object.entries(items)) {
          const ts = getStartOfDay(Number(key))
          if (ts) {
            daily[ts] = typeof val === 'object' ? (val.USD || val.priceUSD || val.price || 0) : Number(val) || 0
          }
        }
      }
    }
  }
  return daily
}

function calculateEbitdaSummary (log, currentBtcPrice) {
  if (!log.length) {
    return {
      totalRevenueBTC: 0,
      totalRevenueUSD: 0,
      totalCostsUSD: 0,
      totalEbitdaSelling: 0,
      totalEbitdaHodl: 0,
      avgBtcProductionCost: null,
      currentBtcPrice: currentBtcPrice || 0
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.revenueBTC += entry.revenueBTC || 0
    acc.revenueUSD += entry.revenueUSD || 0
    acc.costsUSD += entry.totalCostsUSD || 0
    acc.ebitdaSelling += entry.ebitdaSelling || 0
    acc.ebitdaHodl += entry.ebitdaHodl || 0
    return acc
  }, { revenueBTC: 0, revenueUSD: 0, costsUSD: 0, ebitdaSelling: 0, ebitdaHodl: 0 })

  return {
    totalRevenueBTC: totals.revenueBTC,
    totalRevenueUSD: totals.revenueUSD,
    totalCostsUSD: totals.costsUSD,
    totalEbitdaSelling: totals.ebitdaSelling,
    totalEbitdaHodl: totals.ebitdaHodl,
    avgBtcProductionCost: safeDiv(totals.costsUSD, totals.revenueBTC),
    currentBtcPrice: currentBtcPrice || 0
  }
}

// ==================== Cost Summary ====================

async function getCostSummary (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.MONTHLY

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const [productionCosts, priceResults, consumptionResults] = await runParallel([
    (cb) => getProductionCosts(ctx, start, end)
      .then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'HISTORICAL_PRICES', start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
      keys: [{
        type: WORKER_TYPES.POWERMETER,
        startDate,
        endDate,
        fields: { [AGGR_FIELDS.SITE_POWER]: 1 },
        shouldReturnDailyData: 1
      }]
    }).then(r => cb(null, r)).catch(cb)
  ])

  const costsByMonth = processCostsData(productionCosts)
  const dailyPrices = processEbitdaPrices(priceResults)
  const dailyConsumption = processConsumptionData(consumptionResults)

  const allDays = new Set([
    ...Object.keys(dailyConsumption),
    ...Object.keys(dailyPrices)
  ])

  const log = []
  for (const dayTs of [...allDays].sort()) {
    const ts = Number(dayTs)
    const consumption = dailyConsumption[dayTs] || {}
    const btcPrice = dailyPrices[dayTs] || 0

    const powerW = consumption.powerW || 0
    const consumptionMWh = (powerW * 24) / 1000000

    const monthKey = `${new Date(ts).getFullYear()}-${String(new Date(ts).getMonth() + 1).padStart(2, '0')}`
    const costs = costsByMonth[monthKey] || {}
    const energyCostsUSD = costs.energyCostPerDay || 0
    const operationalCostsUSD = costs.operationalCostPerDay || 0
    const totalCostsUSD = energyCostsUSD + operationalCostsUSD

    log.push({
      ts,
      consumptionMWh,
      energyCostsUSD,
      operationalCostsUSD,
      totalCostsUSD,
      allInCostPerMWh: safeDiv(totalCostsUSD, consumptionMWh),
      energyCostPerMWh: safeDiv(energyCostsUSD, consumptionMWh),
      btcPrice
    })
  }

  const aggregated = aggregateByPeriod(log, period)
  const summary = calculateCostSummary(aggregated)

  return { log: aggregated, summary }
}

function calculateCostSummary (log) {
  if (!log.length) {
    return {
      totalEnergyCostsUSD: 0,
      totalOperationalCostsUSD: 0,
      totalCostsUSD: 0,
      totalConsumptionMWh: 0,
      avgAllInCostPerMWh: null,
      avgEnergyCostPerMWh: null,
      avgBtcPrice: null
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.energyCosts += entry.energyCostsUSD || 0
    acc.operationalCosts += entry.operationalCostsUSD || 0
    acc.totalCosts += entry.totalCostsUSD || 0
    acc.consumption += entry.consumptionMWh || 0
    acc.btcPriceSum += entry.btcPrice || 0
    acc.btcPriceCount += entry.btcPrice ? 1 : 0
    return acc
  }, { energyCosts: 0, operationalCosts: 0, totalCosts: 0, consumption: 0, btcPriceSum: 0, btcPriceCount: 0 })

  return {
    totalEnergyCostsUSD: totals.energyCosts,
    totalOperationalCostsUSD: totals.operationalCosts,
    totalCostsUSD: totals.totalCosts,
    totalConsumptionMWh: totals.consumption,
    avgAllInCostPerMWh: safeDiv(totals.totalCosts, totals.consumption),
    avgEnergyCostPerMWh: safeDiv(totals.energyCosts, totals.consumption),
    avgBtcPrice: safeDiv(totals.btcPriceSum, totals.btcPriceCount)
  }
}

// ==================== Subsidy Fees ====================

async function getSubsidyFees (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.DAILY

  const blockResults = await ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
    type: WORKER_TYPES.MEMPOOL,
    query: { key: 'HISTORICAL_BLOCKSIZES', start, end }
  })

  const dailyBlocks = processBlockData(blockResults)

  const log = []
  for (const dayTs of Object.keys(dailyBlocks).sort()) {
    const ts = Number(dayTs)
    const block = dailyBlocks[dayTs]
    log.push({
      ts,
      blockReward: block.blockReward,
      blockTotalFees: block.blockTotalFees,
      blockSize: block.blockSize
    })
  }

  const aggregated = aggregateByPeriod(log, period)
  const summary = calculateSubsidyFeesSummary(aggregated)

  return { log: aggregated, summary }
}

function calculateSubsidyFeesSummary (log) {
  if (!log.length) {
    return {
      totalBlockReward: 0,
      totalBlockTotalFees: 0,
      totalBlockSize: 0,
      avgBlockReward: null,
      avgBlockTotalFees: null,
      avgBlockSize: null
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.blockReward += entry.blockReward || 0
    acc.blockTotalFees += entry.blockTotalFees || 0
    acc.blockSize += entry.blockSize || 0
    return acc
  }, { blockReward: 0, blockTotalFees: 0, blockSize: 0 })

  return {
    totalBlockReward: totals.blockReward,
    totalBlockTotalFees: totals.blockTotalFees,
    totalBlockSize: totals.blockSize,
    avgBlockReward: safeDiv(totals.blockReward, log.length),
    avgBlockTotalFees: safeDiv(totals.blockTotalFees, log.length),
    avgBlockSize: safeDiv(totals.blockSize, log.length)
  }
}

// ==================== Revenue ====================

async function getRevenue (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.DAILY
  const pool = req.query.pool || null

  const type = pool ? WORKER_TYPES.MINERPOOL + '-' + pool : WORKER_TYPES.MINERPOOL
  const query = { key: MINERPOOL_EXT_DATA_KEYS.TRANSACTIONS, start, end }

  const transactionResults = await ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
    type,
    query
  })

  const dailyRevenue = processTransactions(transactionResults, { trackFees: true })

  const log = []
  for (const dayTs of Object.keys(dailyRevenue).sort()) {
    const ts = Number(dayTs)
    const day = dailyRevenue[dayTs]
    const revenueBTC = day.revenueBTC || 0
    const feesBTC = day.feesBTC || 0
    log.push({
      ts,
      revenueBTC,
      feesBTC,
      netRevenueBTC: revenueBTC - feesBTC
    })
  }

  const aggregated = aggregateByPeriod(log, period)
  const summary = calculateRevenueSummary(aggregated)

  return { log: aggregated, summary }
}

function calculateRevenueSummary (log) {
  if (!log.length) {
    return {
      totalRevenueBTC: 0,
      totalFeesBTC: 0,
      totalNetRevenueBTC: 0
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.revenueBTC += entry.revenueBTC || 0
    acc.feesBTC += entry.feesBTC || 0
    acc.netRevenueBTC += entry.netRevenueBTC || 0
    return acc
  }, { revenueBTC: 0, feesBTC: 0, netRevenueBTC: 0 })

  return {
    totalRevenueBTC: totals.revenueBTC,
    totalFeesBTC: totals.feesBTC,
    totalNetRevenueBTC: totals.netRevenueBTC
  }
}

// ==================== Revenue Summary ====================

async function getRevenueSummary (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.DAILY

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const [
    transactionResults,
    priceResults,
    currentPriceResults,
    tailLogResults,
    productionCosts,
    blockResults,
    activeEnergyInResults,
    uteEnergyResults,
    globalConfigResults
  ] = await runParallel([
    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MINERPOOL,
      query: { key: MINERPOOL_EXT_DATA_KEYS.TRANSACTIONS, start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'HISTORICAL_PRICES', start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'current_price' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
      keys: [
        {
          type: WORKER_TYPES.POWERMETER,
          startDate,
          endDate,
          fields: { [AGGR_FIELDS.SITE_POWER]: 1 },
          shouldReturnDailyData: 1
        },
        {
          type: WORKER_TYPES.MINER,
          startDate,
          endDate,
          fields: { [AGGR_FIELDS.HASHRATE_SUM]: 1 },
          shouldReturnDailyData: 1
        }
      ]
    }).then(r => cb(null, r)).catch(cb),

    (cb) => getProductionCosts(ctx, start, end)
      .then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'HISTORICAL_BLOCKSIZES', start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.ELECTRICITY,
      query: { key: 'stats-history', start, end, groupRange: '1D' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.ELECTRICITY,
      query: { key: 'stats-history', start, end, groupRange: '1D' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GLOBAL_CONFIG, {})
      .then(r => cb(null, r)).catch(cb)
  ])

  const dailyRevenue = processTransactions(transactionResults, { trackFees: true })
  const dailyPrices = processEbitdaPrices(priceResults)
  const currentBtcPrice = extractCurrentPrice(currentPriceResults)
  const dailyTailLog = processTailLogData(tailLogResults)
  const costsByMonth = processCostsData(productionCosts)
  const dailyBlocks = processBlockData(blockResults)
  const dailyActiveEnergyIn = processEnergyData(activeEnergyInResults, AGGR_FIELDS.ACTIVE_ENERGY_IN)
  const dailyUteEnergy = processEnergyData(uteEnergyResults, AGGR_FIELDS.UTE_ENERGY)
  const nominalPowerMW = extractNominalPower(globalConfigResults)

  const allDays = new Set([
    ...Object.keys(dailyRevenue),
    ...Object.keys(dailyTailLog),
    ...Object.keys(dailyPrices)
  ])

  const log = []
  for (const dayTs of [...allDays].sort()) {
    const ts = Number(dayTs)
    const revenue = dailyRevenue[dayTs] || {}
    const tailLog = dailyTailLog[dayTs] || {}
    const btcPrice = dailyPrices[dayTs] || currentBtcPrice || 0
    const block = dailyBlocks[dayTs] || {}

    const revenueBTC = revenue.revenueBTC || 0
    const feesBTC = revenue.feesBTC || 0
    const revenueUSD = revenueBTC * btcPrice
    const feesUSD = feesBTC * btcPrice

    const powerW = tailLog.powerW || 0
    const consumptionMWh = (powerW * 24) / 1000000
    const hashrateMhs = tailLog.hashrateMhs || 0
    const hashratePhs = hashrateMhs / 1e9

    const monthKey = `${new Date(ts).getFullYear()}-${String(new Date(ts).getMonth() + 1).padStart(2, '0')}`
    const costs = costsByMonth[monthKey] || {}
    const energyCostsUSD = costs.energyCostPerDay || 0
    const operationalCostsUSD = costs.operationalCostPerDay || 0
    const totalCostsUSD = energyCostsUSD + operationalCostsUSD

    const activeEnergyIn = dailyActiveEnergyIn[dayTs] || 0
    const uteEnergy = dailyUteEnergy[dayTs] || 0

    const curtailmentMWh = activeEnergyIn > 0
      ? activeEnergyIn - consumptionMWh
      : null
    const curtailmentRate = curtailmentMWh !== null
      ? safeDiv(curtailmentMWh, consumptionMWh)
      : null

    const operationalIssuesRate = uteEnergy > 0
      ? safeDiv(uteEnergy - consumptionMWh, uteEnergy)
      : null

    const actualPowerMW = powerW / 1000000
    const powerUtilization = nominalPowerMW > 0
      ? safeDiv(actualPowerMW, nominalPowerMW)
      : null

    log.push({
      ts,
      revenueBTC,
      feesBTC,
      revenueUSD,
      feesUSD,
      btcPrice,
      powerW,
      consumptionMWh,
      hashrateMhs,
      energyCostsUSD,
      operationalCostsUSD,
      totalCostsUSD,
      ebitdaSelling: revenueUSD - totalCostsUSD,
      ebitdaHodl: (revenueBTC * currentBtcPrice) - totalCostsUSD,
      btcProductionCost: safeDiv(totalCostsUSD, revenueBTC),
      energyRevenuePerMWh: safeDiv(revenueUSD, consumptionMWh),
      allInCostPerMWh: safeDiv(totalCostsUSD, consumptionMWh),
      hashRevenueBTCPerPHsPerDay: safeDiv(revenueBTC, hashratePhs),
      hashRevenueUSDPerPHsPerDay: safeDiv(revenueUSD, hashratePhs),
      blockReward: block.blockReward || 0,
      blockTotalFees: block.blockTotalFees || 0,
      blockSize: block.blockSize || 0,
      curtailmentMWh,
      curtailmentRate,
      operationalIssuesRate,
      powerUtilization
    })
  }

  const aggregated = aggregateByPeriod(log, period)
  const summary = calculateDetailedRevenueSummary(aggregated, currentBtcPrice)

  return { log: aggregated, summary }
}

function calculateDetailedRevenueSummary (log, currentBtcPrice) {
  if (!log.length) {
    return {
      totalRevenueBTC: 0,
      totalRevenueUSD: 0,
      totalFeesBTC: 0,
      totalFeesUSD: 0,
      totalCostsUSD: 0,
      totalConsumptionMWh: 0,
      avgCostPerMWh: null,
      avgRevenuePerMWh: null,
      avgBtcPrice: null,
      avgCurtailmentRate: null,
      avgPowerUtilization: null,
      totalEbitdaSelling: 0,
      totalEbitdaHodl: 0,
      currentBtcPrice: currentBtcPrice || 0
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.revenueBTC += entry.revenueBTC || 0
    acc.revenueUSD += entry.revenueUSD || 0
    acc.feesBTC += entry.feesBTC || 0
    acc.feesUSD += entry.feesUSD || 0
    acc.costsUSD += entry.totalCostsUSD || 0
    acc.consumptionMWh += entry.consumptionMWh || 0
    acc.ebitdaSelling += entry.ebitdaSelling || 0
    acc.ebitdaHodl += entry.ebitdaHodl || 0
    acc.btcPriceSum += entry.btcPrice || 0
    acc.btcPriceCount += entry.btcPrice ? 1 : 0
    if (entry.curtailmentRate !== null && entry.curtailmentRate !== undefined) {
      acc.curtailmentRateSum += entry.curtailmentRate
      acc.curtailmentRateCount++
    }
    if (entry.powerUtilization !== null && entry.powerUtilization !== undefined) {
      acc.powerUtilizationSum += entry.powerUtilization
      acc.powerUtilizationCount++
    }
    return acc
  }, {
    revenueBTC: 0,
    revenueUSD: 0,
    feesBTC: 0,
    feesUSD: 0,
    costsUSD: 0,
    consumptionMWh: 0,
    ebitdaSelling: 0,
    ebitdaHodl: 0,
    btcPriceSum: 0,
    btcPriceCount: 0,
    curtailmentRateSum: 0,
    curtailmentRateCount: 0,
    powerUtilizationSum: 0,
    powerUtilizationCount: 0
  })

  return {
    totalRevenueBTC: totals.revenueBTC,
    totalRevenueUSD: totals.revenueUSD,
    totalFeesBTC: totals.feesBTC,
    totalFeesUSD: totals.feesUSD,
    totalCostsUSD: totals.costsUSD,
    totalConsumptionMWh: totals.consumptionMWh,
    avgCostPerMWh: safeDiv(totals.costsUSD, totals.consumptionMWh),
    avgRevenuePerMWh: safeDiv(totals.revenueUSD, totals.consumptionMWh),
    avgBtcPrice: safeDiv(totals.btcPriceSum, totals.btcPriceCount),
    avgCurtailmentRate: safeDiv(totals.curtailmentRateSum, totals.curtailmentRateCount),
    avgPowerUtilization: safeDiv(totals.powerUtilizationSum, totals.powerUtilizationCount),
    totalEbitdaSelling: totals.ebitdaSelling,
    totalEbitdaHodl: totals.ebitdaHodl,
    currentBtcPrice: currentBtcPrice || 0
  }
}

// ==================== Hash Revenue ====================

async function getHashRevenue (ctx, req) {
  const { start, end } = validateStartEnd(req)
  const period = req.query.period || PERIOD_TYPES.DAILY

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const [
    transactionResults,
    tailLogResults,
    priceResults,
    currentPriceResults,
    networkHashrateResults
  ] = await runParallel([
    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MINERPOOL,
      query: { key: MINERPOOL_EXT_DATA_KEYS.TRANSACTIONS, start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
      keys: [{
        type: WORKER_TYPES.MINER,
        startDate,
        endDate,
        fields: { [AGGR_FIELDS.HASHRATE_SUM]: 1 },
        shouldReturnDailyData: 1
      }]
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'prices', start, end }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'current_price' }
    }).then(r => cb(null, r)).catch(cb),

    (cb) => ctx.dataProxy.requestData(RPC_METHODS.GET_WRK_EXT_DATA, {
      type: WORKER_TYPES.MEMPOOL,
      query: { key: 'HISTORICAL_HASHRATE', start, end }
    }).then(r => cb(null, r)).catch(cb)
  ])

  const dailyTransactions = processTransactions(transactionResults, { trackFees: true })
  const dailyHashrate = processHashrateData(tailLogResults)
  const dailyPrices = processEbitdaPrices(priceResults)
  const currentBtcPrice = extractCurrentPrice(currentPriceResults)
  const dailyNetworkHashrate = processNetworkHashrateData(networkHashrateResults)

  const allDays = new Set([
    ...Object.keys(dailyTransactions),
    ...Object.keys(dailyHashrate)
  ])

  const log = []
  for (const dayTs of [...allDays].sort()) {
    const ts = Number(dayTs)
    const transactions = dailyTransactions[dayTs] || {}
    const btcPrice = dailyPrices[dayTs] || currentBtcPrice || 0

    const revenueBTC = transactions.revenueBTC || 0
    const feesBTC = transactions.feesBTC || 0
    const revenueUSD = revenueBTC * btcPrice
    const feesUSD = feesBTC * btcPrice
    const hashrateMhs = dailyHashrate[dayTs] || 0
    const hashratePhs = hashrateMhs / 1e9
    const networkHashrateMhs = dailyNetworkHashrate[dayTs] || 0
    const networkHashratePhs = networkHashrateMhs / 1e9

    log.push({
      ts,
      revenueBTC,
      feesBTC,
      revenueUSD,
      feesUSD,
      btcPrice,
      hashrateMhs,
      hashRevenueBTCPerPHsPerDay: safeDiv(revenueBTC, hashratePhs),
      hashRevenueUSDPerPHsPerDay: safeDiv(revenueUSD, hashratePhs),
      hashCostBTCPerPHsPerDay: safeDiv(feesBTC, hashratePhs),
      hashCostUSDPerPHsPerDay: safeDiv(feesUSD, hashratePhs),
      networkHashPriceBTCPerPHsPerDay: safeDiv(revenueBTC, networkHashratePhs),
      networkHashPriceUSDPerPHsPerDay: safeDiv(revenueUSD, networkHashratePhs),
      networkHashrateMhs
    })
  }

  const aggregated = aggregateByPeriod(log, period)
  const summary = calculateHashRevenueSummary(aggregated)

  return { log: aggregated, summary }
}

function processHashrateData (results) {
  const daily = {}
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const items = entry.data || entry.items || entry
      if (typeof items === 'object' && !Array.isArray(items)) {
        for (const [key, val] of Object.entries(items)) {
          const ts = getStartOfDay(Number(key))
          if (!ts) continue
          if (!daily[ts]) daily[ts] = 0
          if (typeof val === 'object') {
            daily[ts] += (val[AGGR_FIELDS.HASHRATE_SUM] || 0)
          }
        }
      } else if (Array.isArray(items)) {
        for (const item of items) {
          const ts = getStartOfDay(item.ts || item.timestamp)
          if (!ts) continue
          if (!daily[ts]) daily[ts] = 0
          const val = item.val || item
          daily[ts] += (val[AGGR_FIELDS.HASHRATE_SUM] || 0)
        }
      }
    }
  }
  return daily
}

function processNetworkHashrateData (results) {
  const daily = {}
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const rawTs = entry.ts || entry.timestamp || entry.time
      const items = rawTs ? [entry] : (entry.data || entry)
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item) continue
          const itemTs = item.ts || item.timestamp || item.time
          const ts = getStartOfDay(normalizeTimestampMs(itemTs))
          if (!ts) continue
          if (item.avgHashrateMHs) {
            daily[ts] = item.avgHashrateMHs
          }
        }
      } else if (typeof items === 'object') {
        for (const [key, val] of Object.entries(items)) {
          const ts = getStartOfDay(Number(key))
          if (!ts) continue
          if (typeof val === 'object' && val.avgHashrateMHs) {
            daily[ts] = val.avgHashrateMHs
          } else if (typeof val === 'number') {
            daily[ts] = val
          }
        }
      }
    }
  }
  return daily
}

function calculateHashRevenueSummary (log) {
  if (!log.length) {
    return {
      avgHashRevenueBTCPerPHsPerDay: null,
      avgHashRevenueUSDPerPHsPerDay: null,
      avgHashCostBTCPerPHsPerDay: null,
      avgHashCostUSDPerPHsPerDay: null,
      avgNetworkHashPriceBTCPerPHsPerDay: null,
      avgNetworkHashPriceUSDPerPHsPerDay: null,
      totalRevenueBTC: 0,
      totalRevenueUSD: 0,
      totalFeesBTC: 0,
      totalFeesUSD: 0
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.revenueBTC += entry.revenueBTC || 0
    acc.revenueUSD += entry.revenueUSD || 0
    acc.feesBTC += entry.feesBTC || 0
    acc.feesUSD += entry.feesUSD || 0
    if (entry.hashRevenueBTCPerPHsPerDay !== null && entry.hashRevenueBTCPerPHsPerDay !== undefined) {
      acc.hashRevBTCSum += entry.hashRevenueBTCPerPHsPerDay
      acc.hashRevBTCCount++
    }
    if (entry.hashRevenueUSDPerPHsPerDay !== null && entry.hashRevenueUSDPerPHsPerDay !== undefined) {
      acc.hashRevUSDSum += entry.hashRevenueUSDPerPHsPerDay
      acc.hashRevUSDCount++
    }
    if (entry.hashCostBTCPerPHsPerDay !== null && entry.hashCostBTCPerPHsPerDay !== undefined) {
      acc.hashCostBTCSum += entry.hashCostBTCPerPHsPerDay
      acc.hashCostBTCCount++
    }
    if (entry.hashCostUSDPerPHsPerDay !== null && entry.hashCostUSDPerPHsPerDay !== undefined) {
      acc.hashCostUSDSum += entry.hashCostUSDPerPHsPerDay
      acc.hashCostUSDCount++
    }
    if (entry.networkHashPriceBTCPerPHsPerDay !== null && entry.networkHashPriceBTCPerPHsPerDay !== undefined) {
      acc.netHashBTCSum += entry.networkHashPriceBTCPerPHsPerDay
      acc.netHashBTCCount++
    }
    if (entry.networkHashPriceUSDPerPHsPerDay !== null && entry.networkHashPriceUSDPerPHsPerDay !== undefined) {
      acc.netHashUSDSum += entry.networkHashPriceUSDPerPHsPerDay
      acc.netHashUSDCount++
    }
    return acc
  }, {
    revenueBTC: 0,
    revenueUSD: 0,
    feesBTC: 0,
    feesUSD: 0,
    hashRevBTCSum: 0,
    hashRevBTCCount: 0,
    hashRevUSDSum: 0,
    hashRevUSDCount: 0,
    hashCostBTCSum: 0,
    hashCostBTCCount: 0,
    hashCostUSDSum: 0,
    hashCostUSDCount: 0,
    netHashBTCSum: 0,
    netHashBTCCount: 0,
    netHashUSDSum: 0,
    netHashUSDCount: 0
  })

  return {
    avgHashRevenueBTCPerPHsPerDay: safeDiv(totals.hashRevBTCSum, totals.hashRevBTCCount),
    avgHashRevenueUSDPerPHsPerDay: safeDiv(totals.hashRevUSDSum, totals.hashRevUSDCount),
    avgHashCostBTCPerPHsPerDay: safeDiv(totals.hashCostBTCSum, totals.hashCostBTCCount),
    avgHashCostUSDPerPHsPerDay: safeDiv(totals.hashCostUSDSum, totals.hashCostUSDCount),
    avgNetworkHashPriceBTCPerPHsPerDay: safeDiv(totals.netHashBTCSum, totals.netHashBTCCount),
    avgNetworkHashPriceUSDPerPHsPerDay: safeDiv(totals.netHashUSDSum, totals.netHashUSDCount),
    totalRevenueBTC: totals.revenueBTC,
    totalRevenueUSD: totals.revenueUSD,
    totalFeesBTC: totals.feesBTC,
    totalFeesUSD: totals.feesUSD
  }
}

// ==================== Shared ====================

async function getProductionCosts (ctx, start, end) {
  if (!ctx.globalDataLib) return []
  const costs = await ctx.globalDataLib.getGlobalData({
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS
  })
  if (!Array.isArray(costs)) return []

  const startDate = new Date(start)
  const endDate = new Date(end)
  return costs.filter(entry => {
    if (!entry || !entry.year || !entry.month) return false
    const entryDate = new Date(entry.year, entry.month - 1, 1)
    return entryDate >= startDate && entryDate <= endDate
  })
}

function processCostsData (costs) {
  const byMonth = {}
  if (!Array.isArray(costs)) return byMonth
  for (const entry of costs) {
    if (!entry || !entry.year || !entry.month) continue
    const key = `${entry.year}-${String(entry.month).padStart(2, '0')}`
    const daysInMonth = new Date(entry.year, entry.month, 0).getDate()
    byMonth[key] = {
      energyCostPerDay: (entry.energyCost || entry.energyCostsUSD || 0) / daysInMonth,
      operationalCostPerDay: (entry.operationalCost || entry.operationalCostsUSD || 0) / daysInMonth
    }
  }
  return byMonth
}

module.exports = {
  getEnergyBalance,
  getEbitda,
  getCostSummary,
  getSubsidyFees,
  getRevenue,
  getRevenueSummary,
  getHashRevenue,
  getProductionCosts,
  processConsumptionData,
  processPriceData,
  processEnergyData,
  extractNominalPower,
  processCostsData,
  calculateSummary,
  processTailLogData,
  processEbitdaPrices,
  calculateEbitdaSummary,
  calculateCostSummary,
  calculateSubsidyFeesSummary,
  calculateRevenueSummary,
  calculateDetailedRevenueSummary,
  processHashrateData,
  processNetworkHashrateData,
  calculateHashRevenueSummary,
  // Re-export from finance.utils
  validateStartEnd,
  normalizeTimestampMs,
  processTransactions,
  extractCurrentPrice,
  processBlockData
}
