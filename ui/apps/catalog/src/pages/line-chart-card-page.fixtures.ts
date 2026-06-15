/**
 * Synthetic chart payloads for the LineChartCard demo.
 *
 * IMPORTANT — these constants illustrate the `LineChartCardData`
 * shape the component consumes. In production, you wouldn't hand-build
 * them — you'd source them from an adapter hook:
 *
 *   - `useHashrateChartData({ timeline, start, end })`
 *   - `useSiteConsumptionChartData({ timeline, start, end })`
 *
 * Both return a `ChartCardData` payload (datasets + formatters +
 * footer stats) ready to pass straight into `<LineChartCard data=… />`.
 *
 * The `RAW_DATA_EXAMPLE` + `rawDataAdapter` pair demonstrate the
 * escape hatch — the `dataAdapter` prop — for one-off raw payloads
 * that don't have a dedicated hook yet. The aggregate field name
 * (`hashrate_mhs_1m_sum_aggr`) is intentionally inline here because
 * the whole point of the demo section is to show how to convert that
 * shape to chart-ready points.
 */

import { CURRENCY, UNITS } from '@tetherto/mdk-react-devkit/core'
import type { LineChartCardData } from '@tetherto/mdk-react-devkit/foundation'
import { WEBAPP_NAME } from '@tetherto/mdk-react-devkit/foundation'

const now = Date.now()
const HOUR = 3_600_000

const generateTimeSeries = (
  count: number,
  baseValue: number,
  variance: number,
): Array<{ x: number; y: number }> =>
  Array.from({ length: count }, (_, i) => ({
    x: now - (count - 1 - i) * HOUR,
    y: baseValue + (Math.random() - 0.5) * variance,
  }))

export const TIMELINE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '1 H', value: '1h' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1D' },
]

export const BASIC_DATA: LineChartCardData = {
  datasets: [
    {
      label: 'Hashrate',
      borderColor: '#59E8E8',
      data: generateTimeSeries(24, 75, 10),
    },
  ],
  highlightedValue: { value: '75.46', unit: UNITS.HASHRATE_TH_S },
  yTicksFormatter: (v: number) => `${v.toFixed(1)} ${UNITS.HASHRATE_TH_S}`,
}

export const MULTI_SERIES_DATA: LineChartCardData = {
  datasets: [
    {
      label: `${WEBAPP_NAME} Hashrate`,
      borderColor: '#59E8E8',
      data: generateTimeSeries(24, 75, 10),
    },
    {
      label: 'Pool Hashrate',
      borderColor: '#4A6CF7',
      data: generateTimeSeries(24, 60, 8),
    },
  ],
  highlightedValue: { value: '75.46', unit: UNITS.HASHRATE_TH_S },
  yTicksFormatter: (v: number) => `${v.toFixed(1)} ${UNITS.HASHRATE_TH_S}`,
  minMaxAvg: {
    min: `65.2 ${UNITS.HASHRATE_TH_S}`,
    max: `82.1 ${UNITS.HASHRATE_TH_S}`,
    avg: `75.5 ${UNITS.HASHRATE_TH_S}`,
  },
}

export const DETAIL_LEGENDS_DATA: LineChartCardData = {
  datasets: [
    {
      label: 'Hashrate',
      borderColor: '#59E8E8',
      data: generateTimeSeries(24, 75, 10),
      currentValue: { value: 3590, unit: UNITS.HASHRATE_TH_S },
      percentChange: 2.5,
    },
    {
      label: 'Pool Rate',
      borderColor: '#4A6CF7',
      data: generateTimeSeries(24, 60, 8),
      currentValue: { value: 2870, unit: UNITS.HASHRATE_TH_S },
      percentChange: -1.3,
    },
  ],
  highlightedValue: { value: '3,590', unit: UNITS.HASHRATE_TH_S },
  yTicksFormatter: (v: number) => `${v.toFixed(0)} ${UNITS.HASHRATE_TH_S}`,
  minMaxAvg: {
    min: `3,210 ${UNITS.HASHRATE_TH_S}`,
    max: `3,780 ${UNITS.HASHRATE_TH_S}`,
    avg: `3,590 ${UNITS.HASHRATE_TH_S}`,
  },
}

export const FOOTER_STATS_DATA: LineChartCardData = {
  datasets: [
    {
      label: 'Power',
      borderColor: '#F97316',
      data: generateTimeSeries(24, 450, 50),
    },
  ],
  highlightedValue: { value: '452', unit: UNITS.POWER_KW },
  yTicksFormatter: (v: number) => `${v.toFixed(0)} ${UNITS.POWER_KW}`,
  minMaxAvg: {
    min: `410 ${UNITS.POWER_KW}`,
    max: `490 ${UNITS.POWER_KW}`,
    avg: `452 ${UNITS.POWER_KW}`,
  },
  footerStats: [
    { label: 'Total Consumption', value: `10.8 ${UNITS.ENERGY_MWH}` },
    { label: 'Cost (est.)', value: `${CURRENCY.USD}864` },
    { label: 'Efficiency', value: `29.5 ${UNITS.EFFICIENCY_W_PER_TH}` },
    { label: 'PUE', value: '1.12' },
  ],
  footerStatsPerColumn: 2,
  secondaryLabel: { title: 'Period', value: 'Last 24h' },
}

// Raw backend shape — paired with `rawDataAdapter` to demonstrate the
// `dataAdapter` escape hatch. Real consumers should reach for an
// adapter hook (`useHashrateChartData`) instead.
export const RAW_DATA_EXAMPLE = [
  { ts: now - 23 * HOUR, hashrate_mhs_1m_sum_aggr: 72_500_000 },
  { ts: now - 20 * HOUR, hashrate_mhs_1m_sum_aggr: 74_200_000 },
  { ts: now - 17 * HOUR, hashrate_mhs_1m_sum_aggr: 76_800_000 },
  { ts: now - 14 * HOUR, hashrate_mhs_1m_sum_aggr: 73_100_000 },
  { ts: now - 11 * HOUR, hashrate_mhs_1m_sum_aggr: 75_500_000 },
  { ts: now - 8 * HOUR, hashrate_mhs_1m_sum_aggr: 77_900_000 },
  { ts: now - 5 * HOUR, hashrate_mhs_1m_sum_aggr: 74_600_000 },
  { ts: now - 2 * HOUR, hashrate_mhs_1m_sum_aggr: 76_300_000 },
]

export const rawDataAdapter = (data: unknown): LineChartCardData => {
  const points = data as Array<{ ts: number; hashrate_mhs_1m_sum_aggr: number }>
  return {
    datasets: [
      {
        label: 'Hashrate',
        borderColor: '#59E8E8',
        data: points.map((p) => ({ x: p.ts, y: p.hashrate_mhs_1m_sum_aggr / 1_000_000 })),
      },
    ],
    highlightedValue: { value: '76.3', unit: UNITS.HASHRATE_TH_S },
    yTicksFormatter: (v: number) => `${v.toFixed(1)} ${UNITS.HASHRATE_TH_S}`,
  }
}
