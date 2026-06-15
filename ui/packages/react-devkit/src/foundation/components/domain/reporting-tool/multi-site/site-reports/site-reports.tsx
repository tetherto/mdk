import { Button, DataTable, Tabs, TabsList, TabsTrigger } from '@core'
import { createColumnHelper } from '@tanstack/react-table'
import { compareAsc } from 'date-fns/compareAsc'
import { type ReactElement, useMemo, useState } from 'react'

import {
  REPORT_DURATIONS,
  type ReportDuration,
  reportDurationOptions,
} from './site-reports.constants'
import type { SiteReportRecord, SiteReportsProps } from './site-reports.types'
import {
  buildSiteReportRecords,
  formatSiteReportPeriod,
  formatSiteReportPublishedAt,
} from './site-reports-utils'
import './site-reports.scss'

const columnHelper = createColumnHelper<SiteReportRecord>()

/**
 * Site reports index — duration toggle and table of published report windows.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier advanced
 */
export const SiteReports = ({
  className,
  pageTitle = 'Reports',
  siteName,
  duration: controlledDuration,
  defaultDuration = REPORT_DURATIONS.WEEKLY,
  onDurationChange,
  reports: reportsProp,
  referenceDate,
  onViewReport,
}: SiteReportsProps): ReactElement => {
  const [internalDuration, setInternalDuration] = useState<ReportDuration>(defaultDuration)
  const duration = controlledDuration ?? internalDuration

  const setDuration = (next: ReportDuration): void => {
    if (controlledDuration === undefined) {
      setInternalDuration(next)
    }
    onDurationChange?.(next)
  }

  const reports = useMemo(
    () => reportsProp ?? buildSiteReportRecords(duration, referenceDate),
    [reportsProp, duration, referenceDate],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.from, {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => formatSiteReportPeriod(row.original),
        sortingFn: (a, b) => compareAsc(a.original.from, b.original.from),
      }),
      columnHelper.accessor((row) => row.publishedAt, {
        id: 'publishedAt',
        header: 'Date of Publish',
        cell: ({ getValue }) => formatSiteReportPublishedAt(getValue()),
        sortingFn: (a, b) => compareAsc(a.original.publishedAt, b.original.publishedAt),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <Button
            className="mdk-site-reports__view-button"
            disabled={!onViewReport}
            onClick={() =>
              onViewReport?.(row.original, {
                duration,
                siteName,
              })
            }
          >
            View Report
          </Button>
        ),
      }),
    ],
    [duration, onViewReport, siteName],
  )

  return (
    <div className={className ? `${className} mdk-site-reports` : 'mdk-site-reports'}>
      <div className="mdk-site-reports__toolbar">
        <div>
          <h1 className="mdk-site-reports__heading">{pageTitle}</h1>
          {siteName ? <span className="mdk-site-reports__site-name">{siteName}</span> : null}
        </div>
        <Tabs
          className="mdk-site-reports__duration"
          value={duration}
          onValueChange={(next: string) => setDuration(next as ReportDuration)}
        >
          <TabsList variant="side">
            {reportDurationOptions.map((option) => (
              <TabsTrigger key={option.id} variant="side" value={option.id}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mdk-site-reports__table">
        <DataTable data={reports} columns={columns} />
      </div>
    </div>
  )
}
