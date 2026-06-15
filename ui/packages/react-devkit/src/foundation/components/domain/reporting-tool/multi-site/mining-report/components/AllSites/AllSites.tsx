import { formatNumber, UNITS } from '@core'
import _capitalize from 'lodash/capitalize'
import _filter from 'lodash/filter'
import _isString from 'lodash/isString'
import _map from 'lodash/map'
import _toLower from 'lodash/toLower'
import { useMemo } from 'react'

import { formatDataLabel } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'

import type {
  DateRangeString,
  MiningReportSite,
  ReportApiResponse,
  ReportType,
} from '../../mining-report.types'
import { ReportBarChart } from '../../report-charts/report-bar-chart'
import { ReportLineChart } from '../../report-charts/report-line-chart'
import ReportHeader from '../ReportHeader/ReportHeader'

import { AllSitesMetricsSection } from './all-sites-metrics-grid'
import { listAllSitesMetrics, listSiteMetrics } from './all-sites-metrics.constants'
import { buildAllSitesChartsForReport } from './AllSites.util'

type AllSitesProps = {
  siteId?: string
  data: ReportApiResponse
  reportType?: ReportType
  sites: MiningReportSite[]
  dateRange: DateRangeString
}

const hasSiteName = (site: MiningReportSite | undefined): site is MiningReportSite =>
  !!site && _isString(site.name) && site.name.length > 0

const AllSites = ({ data, dateRange, reportType = 'weekly', sites, siteId }: AllSitesProps) => {
  const siteList = useMemo(
    () => (siteId ? _filter(sites, (site) => _toLower(site.id) === _toLower(siteId)) : sites),
    [siteId, sites],
  )
  const site = siteId ? siteList[0] : undefined

  const { chartsData, viewConfig } = useMemo(
    () => buildAllSitesChartsForReport(data, reportType, dateRange),
    [data, reportType, dateRange],
  )

  const formattedBtcPrice = useMemo(() => {
    const btcPrice = data?.data?.summary?.avg?.currentBTCPrice
    return btcPrice ? formatNumber(btcPrice, { maximumFractionDigits: 0 }) : undefined
  }, [data])

  const showAllSitesSummary = !hasSiteName(site)
  const showIndividualSites = showAllSitesSummary && siteList.length > 0

  return (
    <>
      <ReportHeader
        title={`All Sites Summary - ${_capitalize(reportType)}`}
        subtitle={dateRange}
        priceText="Average Price:"
        priceValue={formattedBtcPrice}
      />

      {showAllSitesSummary && (
        <AllSitesMetricsSection
          sectionKey="all-sites"
          title="All Sites"
          metrics={listAllSitesMetrics(chartsData.allSitesMetrics)}
        />
      )}

      {showIndividualSites && (
        <div className="mdk-mining-report__individual-sites">
          {_map(siteList, (item) => (
            <AllSitesMetricsSection
              key={item.id}
              title={_capitalize(item.name ?? item.label)}
              metrics={listSiteMetrics(chartsData.siteMetrics, item.id)}
              noMinWidth
              wrapper="site-card"
            />
          ))}
        </div>
      )}

      {hasSiteName(site) && (
        <AllSitesMetricsSection
          title={_capitalize(site.name)}
          metrics={listSiteMetrics(chartsData.siteMetrics, site.id)}
        />
      )}

      <div
        className={
          viewConfig.isYearlyLayout
            ? 'mdk-mining-report__charts'
            : 'mdk-mining-report__charts mdk-mining-report__charts--not-yearly'
        }
      >
        <ReportBarChart
          chartTitle={viewConfig.revenue.title}
          data={chartsData.revenueChart}
          isStacked
          barWidth={viewConfig.revenue.barWidth}
          isLegendVisible
          showDataLabels
          displayColors={false}
          yTicksFormatter={viewConfig.revenue.yFormatter}
          unit={viewConfig.revenue.unit}
        />

        {viewConfig.isYearlyLayout && chartsData.productionCostChart && (
          <ReportBarChart
            chartTitle="Bitcoin Production Cost"
            data={chartsData.productionCostChart}
            barWidth={14}
            displayColors={false}
            unit="M"
            isLegendVisible
            showDataLabels
            yTicksFormatter={(v) => formatDataLabel(v / 1_000)}
          />
        )}

        <ReportLineChart
          title={viewConfig.hashrate.title}
          data={chartsData.hashrateChart}
          unit={viewConfig.hashrate.unit}
          timeframeType={viewConfig.hashrate.timeframeType}
        />

        <ReportBarChart
          chartTitle={viewConfig.downtime.title}
          data={chartsData.downtimeChart}
          isStacked
          barWidth={viewConfig.downtime.barWidth}
          isLegendVisible
          yTicksFormatter={(v) => `${Math.round(v * 100)}%`}
          unit={UNITS.PERCENT}
        />
      </div>
    </>
  )
}

export default AllSites
