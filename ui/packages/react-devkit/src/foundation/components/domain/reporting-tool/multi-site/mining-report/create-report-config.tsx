import MonthlyReport from './periods/Monthly'
import WeeklyReport from './periods/Weekly'
import AnnualReport from './periods/Yearly'
import type { MiningReportProps, ReportApiResponse, ReportConfig } from './mining-report.types'
import {
  formatDateForFilename,
  getMonthYear,
  normalizeReportLocationLabel,
  sanitizeFileName,
} from './mining-report.util'

export const createReportConfig = (
  type: string,
  location: string,
  dateRange: string,
  reportData: ReportApiResponse,
  sites: MiningReportProps['sites'],
  siteId?: string,
): ReportConfig => {
  const displayLocation = normalizeReportLocationLabel(location)
  const sanitizedLocation = sanitizeFileName(displayLocation)
  const dateStr = formatDateForFilename(dateRange)

  const baseConfig = {
    title: displayLocation,
    fileName: `${sanitizedLocation}-${type}-report-${dateStr}.pdf`,
  }

  const periodProps = { data: reportData, dateRange, sites, siteId }

  const defaultConfig: ReportConfig = {
    ...baseConfig,
    component: <AnnualReport {...periodProps} />,
    subtitle: `1 Year • ${dateRange}`,
  }

  const configs: Record<string, ReportConfig> = {
    weekly: {
      ...baseConfig,
      component: <WeeklyReport {...periodProps} />,
      subtitle: `Weekly • ${dateRange}`,
    },
    monthly: {
      ...baseConfig,
      component: <MonthlyReport {...periodProps} />,
      subtitle: (() => {
        const { monthName, year } = getMonthYear(dateRange)
        return monthName && year ? `${monthName} ${year}` : dateRange
      })(),
    },
    annual: defaultConfig,
    yearly: defaultConfig,
  }

  return configs[type] ?? defaultConfig
}
