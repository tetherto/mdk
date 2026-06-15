import { format as fmt } from 'date-fns/format'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isArray from 'lodash/isArray'
import _map from 'lodash/map'

import type { LogEntry, ReportApiResponse } from '../mining-report.types'

import { PERIOD } from '@/constants/ranges'

export const PERIOD_MAP: Record<string, string> = {
  weekly: 'daily',
  monthly: 'daily',
  yearly: 'monthly',
}

export const getPeriod = (api: ReportApiResponse | undefined): string =>
  api?.period || api?.regions?.[0]?.log?.[0]?.period || api?.data?.log?.[0]?.period || 'daily'

export const makeLabelFormatter = (period: string): ((ts: number) => string) => {
  if (period === PERIOD.MONTHLY) return (ts: number) => fmt(new Date(Number(ts)), 'MM-yy')
  return (ts: number) => fmt(new Date(Number(ts)), 'dd-MM')
}

export const pickLogs = (
  api: ReportApiResponse | undefined,
  regionFilter?: string[],
): { logsPerSource: LogEntry[][]; period: string } => {
  const regions = _isArray(api?.regions) ? api.regions : []
  const period = getPeriod(api)

  if (regionFilter?.length) {
    const selected = _filter(regions, (r) => _includes(regionFilter, r.region))
    return { logsPerSource: _map(selected, (r) => r.log || []), period }
  }

  if (_isArray(api?.data?.log)) {
    return { logsPerSource: [api.data.log], period }
  }

  return { logsPerSource: _map(regions, (r) => r.log || []), period }
}
