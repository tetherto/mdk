import { CURRENCY, UNITS } from '@core'

import { getHashrateString } from '@/utils/device-utils'

import _upper from 'lodash/upperCase'
import _values from 'lodash/values'

import type { MetricCardData } from '../../mining-report.types'
import { getConsumptionString, getEfficiencyString } from '../../mining-report.util'

/** Default labels/units/formatters for All Sites summary metric cards (empty values until populated from API). */
export type AllSitesMetricKey =
  | 'btcMined'
  | 'avgEnergyCost'
  | 'avgBtcCost'
  | 'avgHashrate'
  | 'avgEfficiency'
  | 'avgEnergyRevenue'
  | 'avgDowntime'
  | 'avgPowerConsumption'

export type AllSitesMetricsTemplate = Record<AllSitesMetricKey, MetricCardData>

export const ALL_SITES_METRICS_TEMPLATE: AllSitesMetricsTemplate = {
  btcMined: {
    label: 'Bitcoin mined',
    unit: CURRENCY.BTC,
    value: '',
    isHighlighted: true,
  },
  avgEnergyCost: {
    label: 'Avg Energy All-in Cost',
    unit: `${CURRENCY.USD}/${UNITS.ENERGY_MW}`,
    value: '',
  },
  avgBtcCost: {
    label: 'Avg Bitcoin Prod. Cost',
    unit: CURRENCY.USD,
    value: '',
  },
  avgHashrate: {
    label: 'Avg Hashrate',
    value: '',
    formatter: getHashrateString,
  },
  avgEfficiency: {
    isHighlighted: true,
    label: 'Avg Efficiency',
    value: '',
    formatter: getEfficiencyString,
  },
  avgEnergyRevenue: {
    label: 'Avg Energy Revenue',
    unit: `${CURRENCY.USD}/${UNITS.ENERGY_MW}`,
    value: '',
  },
  avgDowntime: {
    label: 'Downtime Rate',
    unit: '%',
    value: '',
  },
  avgPowerConsumption: {
    label: 'Avg Power Consumption',
    value: '',
    formatter: getConsumptionString,
  },
}

export const listAllSitesMetrics = (
  metrics?: Partial<AllSitesMetricsTemplate> & Record<string, MetricCardData>,
): MetricCardData[] => _values(metrics ?? ALL_SITES_METRICS_TEMPLATE)

export const listSiteMetrics = (
  siteMetrics: Record<string, Record<string, MetricCardData>> | undefined,
  siteId: string,
): MetricCardData[] => _values(siteMetrics?.[_upper(siteId)] ?? ALL_SITES_METRICS_TEMPLATE)
