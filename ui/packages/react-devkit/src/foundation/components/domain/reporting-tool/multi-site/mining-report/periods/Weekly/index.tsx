import _map from 'lodash/map'

import AllSites from '../../components/AllSites/AllSites'
import ReportPage from '../../components/ReportPage/ReportPage'
import SiteDetails, { filterSitesForReport } from '../../components/SiteDetails'
import type {
  DateRangeString,
  MiningReportSite,
  ReportApiResponse,
} from '../../mining-report.types'

type WeeklyReportProps = {
  data: ReportApiResponse
  dateRange: DateRangeString
  sites: MiningReportSite[]
  siteId?: string
}

export default function WeeklyReport({ data, dateRange, sites, siteId }: WeeklyReportProps) {
  const filteredSiteList = filterSitesForReport(sites, siteId)

  return (
    <>
      {!siteId && (
        <ReportPage>
          <AllSites data={data} dateRange={dateRange} reportType="weekly" sites={sites} />
        </ReportPage>
      )}

      {_map(filteredSiteList, (site) => (
        <SiteDetails
          site={site}
          key={site.value}
          reportData={data}
          dateRange={dateRange}
          reportType="weekly"
          showCover={!siteId}
        />
      ))}
    </>
  )
}
