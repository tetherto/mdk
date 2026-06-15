import _filter from 'lodash/filter'
import _toLower from 'lodash/toLower'
import _toUpper from 'lodash/toUpper'
import * as React from 'react'

import ReportCover from '../ReportCover/ReportCover'
import ReportPage from '../ReportPage/ReportPage'

import CostSummary from './CostSummary/CostSummary'
import { buildCostSummaryCharts } from './CostSummary/CostSummary.util'
import DailyHashrates from './DailyHashrate/DailyHashrate'
import { buildDailyHashratesCharts } from './DailyHashrate/DailyHashrate.util'
import Ebitda from './Ebitda/Ebitda'
import { buildEbitdaCharts } from './Ebitda/Ebitda.util'
import Efficiency from './Efficiency/Efficiency'
import { buildEfficiencyChart } from './Efficiency/Efficiency.util'
import EnergyCosts from './EnergyCosts/EnergyCosts'
import { buildEnergyCostsCharts } from './EnergyCosts/EnergyCosts.util'
import EnergyRevenues from './EnergyRevenues/EnergyRevenues'
import { buildEnergyRevenuesCharts } from './EnergyRevenues/EnergyRevenues.util'
import HashCosts from './HashCosts/HashCosts'
import { buildHashCostsCharts } from './HashCosts/HashCosts.util'
import HashRevenues from './HashRevenues/HashRevenues'
import { buildHashRevenuesCharts } from './HashRevenues/HashRevenues.util'
import Operations from './Operations/Operations'
import { buildOperationsCharts } from './Operations/Operations.util'
import PowerConsumption from './PowerConsumption/PowerConsumption'
import { buildPowerConsumptionChart } from './PowerConsumption/PowerConsumption.util'
import RevenuesSummary from './RevenueSummary/RevenueSummary'
import { buildRevenuesSummaryData } from './RevenueSummary/RevenueSummary.util'
import { getSiteDetailsConfig } from './SiteDetails.config'
import SubsidyVSFees from './SubsidyVSFees/SubsidyVSFees'
import { buildSubsidyFeesCharts } from './SubsidyVSFees/SubsidyVSFees.util'
import Workers from './Workers/Workers'
import { buildWorkersChart } from './Workers/Workers.util'

import type {
  DateRangeString,
  MiningReportSite,
  ReportApiResponse,
  ReportType,
} from '../../mining-report.types'

type SiteDetailsProps = {
  site: MiningReportSite
  reportData: ReportApiResponse
  dateRange: DateRangeString
  reportType: ReportType
  showCover?: boolean
}

export default function SiteDetails({
  site,
  reportData,
  dateRange,
  reportType,
  showCover = true,
}: SiteDetailsProps) {
  const siteCode = _toUpper(site.value)
  const config = getSiteDetailsConfig(reportType)

  const { revenuesChart, operationsEnergyCostData, bitcoinMetrics, energyHashMetrics } =
    buildRevenuesSummaryData(reportData, { regionFilter: [siteCode], buckets: config.buckets })

  const { subsidyFees, avgFeesSats } = buildSubsidyFeesCharts(reportData, {
    days: config.subsidyDays,
    regionFilter: [siteCode],
  })

  const { siteRevenueUSD, siteRevenueBTC, avgDowntime, powerSeries, downtimeMetrics } =
    buildEnergyRevenuesCharts(
    reportData,
    {
      regionFilter: [siteCode],
      days: config.days,
      powerDays: config.powerDays,
      powerUnitDivisor: 1e6,
    },
  )

  const { siteHashUSD, siteHashBTC, networkHashrate, networkHashprice, hashMetrics } =
    buildHashRevenuesCharts(reportData, {
      regionFilter: [siteCode],
      days: config.days,
    })

  const { hashrate, efficiency, workers, powerConsumption } = buildOperationsCharts(reportData, {
    regionFilter: [siteCode],
    days: config.days,
  })

  const {
    hashpriceChart,
    dailyHashrateChart,
    metrics: hashrateMetrics,
  } = buildDailyHashratesCharts(reportData, { siteCode, days: config.days })

  const efficiencyData = buildEfficiencyChart(reportData, { siteCode, buckets: config.buckets })

  const workersData = buildWorkersChart(reportData, { siteCode, days: config.days })

  const powerData = buildPowerConsumptionChart(reportData, {
    siteCode,
    days: config.days,
    powerUnitDivisor: 1e6,
  })

  const yearlyData = config.showYearlyPages
    ? {
        ebitda: buildEbitdaCharts(reportData, {
          regionFilter: [siteCode],
          buckets: config.buckets,
        }),
        costSummary: buildCostSummaryCharts(reportData, {
          regionFilter: [siteCode],
          buckets: config.buckets,
        }),
        hashCosts: buildHashCostsCharts(reportData, { siteCode, buckets: config.buckets }),
        energyCosts: buildEnergyCostsCharts(reportData, {
          siteCode,
          buckets: config.buckets,
        }),
      }
    : null

  return (
    <React.Fragment key={site.value}>
      {showCover && (
        <ReportPage isCover>
          <ReportCover
            isFront={false}
            title={site.name ?? site.label}
            showLogo
            subtitle={dateRange}
          />
        </ReportPage>
      )}

      <ReportPage
        title={`${siteCode} Revenues Summary - ${config.periodLabel}`}
        subtitle={dateRange}
        showLogo={false}
      >
        <RevenuesSummary
          data={revenuesChart}
          operationsEnergyCostData={operationsEnergyCostData}
          bitcoinMetrics={bitcoinMetrics}
          energyHashMetrics={energyHashMetrics}
        />
      </ReportPage>

      {config.showYearlyPages && yearlyData && (
        <ReportPage title={`${siteCode} Cost Summary - ${config.periodLabel}`} subtitle={dateRange}>
          <CostSummary
            metrics={yearlyData.costSummary.metrics}
            btcProdCost={yearlyData.costSummary.btcProdCost}
            powerCost={yearlyData.costSummary.powerCost}
            avgDowntime={yearlyData.costSummary.avgDowntime}
          />
        </ReportPage>
      )}

      {config.showYearlyPages && yearlyData && (
        <ReportPage title={`${siteCode} EBITDA - ${config.periodLabel}`} subtitle={dateRange}>
          <Ebitda
            btcProducedChart={yearlyData.ebitda.btcProducedChart}
            ebitdaChart={yearlyData.ebitda.ebitdaChart}
            ebitdaMetrics={yearlyData.ebitda.ebitdaMetrics}
          />
        </ReportPage>
      )}

      <ReportPage
        title={`${siteCode} Subsidy vs Fees - ${config.periodLabel}`}
        subtitle={dateRange}
      >
        <SubsidyVSFees subsidyFees={subsidyFees} avgFeesSats={avgFeesSats} />
      </ReportPage>

      <ReportPage
        title={`${siteCode} Energy Revenues - ${config.periodLabel}`}
        subtitle={dateRange}
      >
        <EnergyRevenues
          timeframeType={config.timeframeType}
          siteRevenueUSD={siteRevenueUSD}
          siteRevenueBTC={siteRevenueBTC}
          avgDowntime={avgDowntime}
          avgDowntimeChartTitle={config.avgDowntimeChartTitle}
          powerSeries={powerSeries}
          downtimeMetrics={downtimeMetrics}
        />
      </ReportPage>

      {config.showYearlyPages && yearlyData && (
        <ReportPage title={`${siteCode} Energy Costs - ${config.periodLabel}`} subtitle={dateRange}>
          <EnergyCosts
            timeframeType={config.timeframeType}
            energyMetrics={yearlyData.energyCosts.energyMetrics}
            powerSeries={yearlyData.energyCosts.powerSeries}
            revenueVsCost={yearlyData.energyCosts.revenueVsCost}
          />
        </ReportPage>
      )}

      <ReportPage title={`${siteCode} Hash Revenues - ${config.periodLabel}`} subtitle={dateRange}>
        <HashRevenues
          timeframeType={config.showYearlyPages ? config.timeframeType : undefined}
          siteHashUSD={siteHashUSD}
          siteHashBTC={siteHashBTC}
          networkHashrate={networkHashrate}
          networkHashprice={networkHashprice}
          hashMetrics={hashMetrics}
        />
      </ReportPage>

      {config.showYearlyPages && yearlyData && (
        <ReportPage title={`${siteCode} Hash Costs - ${config.periodLabel}`} subtitle={dateRange}>
          <HashCosts
            timeframeType={config.timeframeType}
            revCostHashprice={yearlyData.hashCosts.revCostHashprice}
            hashrate={yearlyData.hashCosts.hashrate}
            hashCostMetrics={yearlyData.hashCosts.hashCostMetrics}
          />
        </ReportPage>
      )}

      <ReportPage title={`${siteCode} Operations - ${config.periodLabel}`} subtitle={dateRange}>
        <Operations
          timeframeType={config.showYearlyPages ? config.timeframeType : undefined}
          hashrate={hashrate}
          efficiency={efficiency}
          workers={workers}
          powerConsumption={powerConsumption}
        />
      </ReportPage>

      <ReportPage
        title={`${siteCode} Daily Average Hashrate - ${config.periodLabel}`}
        subtitle={dateRange}
      >
        <DailyHashrates
          timeframeType={config.timeframeType}
          hashpriceChart={hashpriceChart}
          dailyHashrateChart={dailyHashrateChart}
          metrics={hashrateMetrics}
        />
      </ReportPage>

      <ReportPage
        title={`${siteCode} Average Efficiency - ${config.periodLabel}`}
        subtitle={dateRange}
      >
        <Efficiency efficiencyData={efficiencyData} timeframeType={config.timeframeType} />
      </ReportPage>

      <ReportPage title={`${siteCode} Workers - ${config.periodLabel}`} subtitle={dateRange}>
        <Workers timeframeType={config.timeframeType} workersData={workersData} />
      </ReportPage>

      <ReportPage
        title={`${siteCode} Power Consumption - ${config.periodLabel}`}
        subtitle={dateRange}
      >
        <PowerConsumption timeframeType={config.timeframeType} powerData={powerData} />
      </ReportPage>
    </React.Fragment>
  )
}

export const filterSitesForReport = (
  sites: MiningReportSite[],
  siteId?: string,
): MiningReportSite[] => {
  if (!siteId) return sites
  return _filter(sites, (site) => _toLower(site.id) === _toLower(siteId))
}
