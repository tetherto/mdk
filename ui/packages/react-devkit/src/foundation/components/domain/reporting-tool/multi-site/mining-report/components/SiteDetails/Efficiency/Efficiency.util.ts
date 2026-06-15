// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _get from 'lodash/get'
import _map from 'lodash/map'
import _sortBy from 'lodash/sortBy'

import { CHART_COLORS } from '@core'
import {
  buildLineChart,
  EMPTY_STRUCTURES,
  extractNominalValues,
  findRegionBySite,
  safeNum,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { SiteScopedChartOptions } from '../site-details.types'

export const buildEfficiencyChart = (
  api: ReportApiResponse,
  { siteCode, buckets = 30 }: SiteScopedChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.efficiency
  }

  const region = findRegionBySite(api, siteCode)
  if (!region) return EMPTY_STRUCTURES.efficiency

  const { efficiency: nominalEfficiency } = extractNominalValues(region)
  const sorted = _sortBy(region.log || [], 'ts')
  const tail = sorted.slice(-buckets)

  const points = _map(tail, (row) => ({
    ts: _get(row, ['ts'], 0),
    value: safeNum(_get(row, ['efficiencyWThs'], 0)),
  }))

  return buildLineChart(
    [
      {
        label: 'Actual Sites Efficiency',
        data: points,
        color: CHART_COLORS.blue,
      },
    ],
    [
      {
        label: 'Nominal Miners Efficiency',
        value: nominalEfficiency,
        color: CHART_COLORS.red,
      },
    ],
  )
}
