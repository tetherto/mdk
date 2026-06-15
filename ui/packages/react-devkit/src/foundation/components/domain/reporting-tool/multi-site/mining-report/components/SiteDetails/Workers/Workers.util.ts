// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _get from 'lodash/get'
import _map from 'lodash/map'
import _sortBy from 'lodash/sortBy'
import _takeRight from 'lodash/takeRight'

import { CHART_COLORS, COLOR } from '@core'
import {
  buildLineChart,
  EMPTY_STRUCTURES,
  extractNominalValues,
  findRegionBySite,
  pickLogs,
  safeNum,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { SiteScopedChartOptions } from '../site-details.types'

export const buildWorkersChart = (
  api: ReportApiResponse,
  { siteCode, days = 30 }: SiteScopedChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.workers
  }

  const { logsPerSource } = pickLogs(api, siteCode ? [siteCode] : undefined)
  if (!logsPerSource.length) {
    return EMPTY_STRUCTURES.workers
  }

  const region = findRegionBySite(api, siteCode)
  const { minerCapacity: cap } = extractNominalValues(region)

  const logs = _sortBy(logsPerSource[0] || [], 'ts')
  const last = _takeRight(logs, days)

  const points = _map(last, (row) => {
    const downtime = safeNum(_get(row, ['downtimeRate'], 0))
    const active = cap * Math.max(0, 1 - downtime)
    return { ts: row.ts, value: active }
  })

  return buildLineChart(
    [
      {
        label: 'Daily Avg Active Miners',
        data: points,
        color: COLOR.MINT_GREEN,
      },
    ],
    [
      {
        label: 'Total Miner Capacity',
        value: cap,
        color: CHART_COLORS.red,
      },
    ],
  )
}
