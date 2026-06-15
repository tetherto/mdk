import _map from 'lodash/map'

import AllSites from '../../components/AllSites/AllSites'
import ReportPage from '../../components/ReportPage/ReportPage'
import SiteDetails, { filterSitesForReport } from '../../components/SiteDetails'
import type {
  DateRangeString,
  MiningReportSite,
  ReportApiResponse,
} from '../../mining-report.types'

type AnnualReportProps = {
  data: ReportApiResponse
  dateRange: DateRangeString
  sites: MiningReportSite[]
  siteId?: string
}

export default function AnnualReport({ data, dateRange, sites, siteId }: AnnualReportProps) {
  const filteredSiteList = filterSitesForReport(sites, siteId)

  return (
    <>
      {!siteId && (
        <ReportPage>
          <AllSites data={data} dateRange={dateRange} reportType="yearly" sites={sites} />
        </ReportPage>
      )}

      {_map(filteredSiteList, (site) => (
        <SiteDetails
          site={site}
          key={site.value}
          reportData={data}
          dateRange={dateRange}
          reportType="yearly"
          showCover={!siteId}
        />
      ))}
    </>
  )
}
