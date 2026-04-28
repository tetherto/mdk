/**
 * Demo chart data for the component showcase.
 * Used by LineChart, BarChart, and AreaChart demos in App.tsx.
 */

import { COLOR } from '@tetherto/mdk-core-ui'
import { WEBAPP_DISPLAY_NAME } from '@tetherto/mdk-foundation-ui'

export const LINE_CHART_REVENUE_BASIC = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Revenue',
      data: [12, 19, 8, 15, 22, 18],
    },
  ],
}

export const LINE_CHART_HASH_RATE = {
  labels: ['12:45', '12:50', '12:55', '13:00', '13:05', '13:10'],
  datasets: [
    {
      label: `${WEBAPP_DISPLAY_NAME} Hash Rate`,
      data: [75.46, 75.46, 75.48, 75.45, 75.47, 75.46],
      borderColor: 'hsl(180 70% 50%)',
    },
    {
      label: 'Aggr Pool Hash Rate',
      data: [58, 59, 60, 58, 59, 60],
      borderColor: 'hsl(220 70% 45%)',
    },
    {
      label: 'Pool Hash Rate',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'hsl(270 60% 60%)',
    },
    {
      label: 'Ocean Hash Rate',
      data: [58, 59, 60, 58, 59, 60],
      borderColor: 'hsl(0 70% 55%)',
    },
  ],
}

export const LINE_CHART_TEMPERATURE = {
  labels: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  datasets: [
    {
      label: 'Temperature',
      data: [22, 24, 23, 25, 26, 24],
    },
  ],
}

export const LINE_CHART_DAILY_REVENUE = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  datasets: [
    {
      label: 'Revenue',
      data: [1200, 1350, 1100, 1420, 1380, 1500],
    },
  ],
}

export const BAR_CHART_MINING_OUTPUT = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'TH/s',
      data: [65, 72, 68, 75, 70, 80, 78],
    },
  ],
}

export const BAR_CHART_STACKED_REVENUE = {
  labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  datasets: [
    {
      label: 'SITE-A',
      data: [63, 30, 59, 75, 20, 10, 27, 45, 12, 45, 33, 28],
      backgroundColor: COLOR.SLEEP_BLUE,
      borderColor: COLOR.SLEEP_BLUE,
      stack: 'revenue',
    },
    {
      label: 'SITE-B',
      data: [30, 9, 26, 35, 20, 27, 18, 27, 20, 42, 20, 19],
      backgroundColor: COLOR.RED,
      borderColor: COLOR.RED,
      stack: 'revenue',
    },
  ],
}

export const BAR_CHART_GROUPED_SITES = {
  labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  datasets: [
    {
      label: 'SITE-C',
      data: [58, 26, 55, 59, 28, 10, 55, 57, 26, 12, 58, 26],
      backgroundColor: COLOR.SLEEP_BLUE,
      borderColor: COLOR.SLEEP_BLUE,
    },
    {
      label: 'SITE-D',
      data: [34, 9, 31, 33, 22, 27, 18, 30, 28, 11, 31, 25],
      backgroundColor: COLOR.RED,
      borderColor: COLOR.RED,
    },
  ],
}

export const BAR_CHART_HORIZONTAL_MINERS = {
  labels: ['S19 Pro', 'S19j Pro', 'S21', 'M50', 'M60', 'T21'],
  datasets: [
    {
      label: 'Online',
      data: [120, 85, 64, 42, 38, 25],
      backgroundColor: [
        COLOR.GREEN,
        COLOR.SLEEP_BLUE,
        COLOR.COLD_ORANGE,
        COLOR.PURPLE_HIGH,
        COLOR.BLUE_SEA,
        COLOR.RED,
      ],
      borderColor: [
        COLOR.GREEN,
        COLOR.SLEEP_BLUE,
        COLOR.COLD_ORANGE,
        COLOR.PURPLE_HIGH,
        COLOR.BLUE_SEA,
        COLOR.RED,
      ],
    },
  ],
}

export const BAR_CHART_SUBSIDY_FEES = {
  labels: ['02-08', '02-09', '02-10', '02-11', '02-12', '02-13', '02-14'],
  datasets: [
    {
      label: 'Subsidy',
      data: [2.8, 2.6, 2.9, 3.0, 2.7, 2.5, 3.1],
      backgroundColor: COLOR.SLEEP_BLUE,
      borderColor: COLOR.SLEEP_BLUE,
      stack: 'btc',
    },
    {
      label: 'Fees',
      data: [0.34, 0.53, 0.24, 0.15, 0.46, 0.63, 0.06],
      backgroundColor: COLOR.COLD_ORANGE,
      borderColor: COLOR.COLD_ORANGE,
      stack: 'btc',
    },
    {
      type: 'line' as const,
      label: 'Fee %',
      data: [0.5, 1.0, 1.2, 1.6, 1.5, 2.5, 2.9],
      borderColor: COLOR.RED,
      backgroundColor: COLOR.RED,
      yAxisID: 'y1',
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: false,
    },
  ],
}

export const BAR_CHART_MINERS_STATUS = {
  labels: ['02-11', '02-12', '02-13', '02-14', '02-15', '02-16', '02-17'],
  datasets: [
    {
      label: 'Online',
      data: [198, 200, 195, 197, 199, 198, 200],
      backgroundColor: COLOR.GREEN,
      borderColor: COLOR.GREEN,
      stack: 'status',
    },
    {
      label: 'Error',
      data: [58, 55, 60, 57, 56, 58, 54],
      backgroundColor: COLOR.RED,
      borderColor: COLOR.RED,
      stack: 'status',
    },
    {
      label: 'Offline',
      data: [12, 14, 10, 13, 11, 12, 10],
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
      stack: 'status',
    },
    {
      label: 'Sleep',
      data: [8, 10, 7, 9, 8, 10, 6],
      backgroundColor: COLOR.SLEEP_BLUE,
      borderColor: COLOR.SLEEP_BLUE,
      stack: 'status',
    },
    {
      label: 'Maintenance',
      data: [64, 61, 68, 64, 66, 62, 70],
      backgroundColor: COLOR.COLD_ORANGE,
      borderColor: COLOR.COLD_ORANGE,
      stack: 'status',
    },
  ],
}

// ── Doughnut chart data ─────────────────────────────────────────────────────

export const DOUGHNUT_CHART_MINER_STATUS = [
  { label: 'Online', value: 198, color: COLOR.GREEN },
  { label: 'Error', value: 58, color: COLOR.RED },
  { label: 'Offline', value: 12, color: COLOR.WHITE },
  { label: 'Sleep', value: 8, color: COLOR.SLEEP_BLUE },
  { label: 'Maintenance', value: 64, color: COLOR.COLD_ORANGE },
]

export const DOUGHNUT_CHART_MINER_TYPES = [
  { label: 'Antminer S19XP', value: 54, color: COLOR.SLEEP_BLUE },
  { label: 'Antminer S19XP H', value: 4, color: '#C084FC' },
  { label: 'Avalon A1346', value: 48, color: COLOR.PURPLE_HIGH },
  { label: 'Whatsminer M30SP', value: 81, color: '#BEF264' },
  { label: 'Whatsminer M53S', value: 5, color: COLOR.BRICK_RED },
  { label: 'Whatsminer M56S', value: 79, color: COLOR.GRASS_GREEN },
]

export const DOUGHNUT_CHART_SITE_DISTRIBUTION = [
  { label: 'SITE-A', value: 340 },
  { label: 'SITE-B', value: 220 },
  { label: 'SITE-C', value: 180 },
  { label: 'SITE-D', value: 95 },
]

export const AREA_CHART_HASHRATE_TREND = {
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  datasets: [
    {
      label: 'Hashrate',
      data: [100, 95, 110, 105, 120, 115],
    },
  ],
}

export const AREA_CHART_HASHRATE_TREND_BLUE = {
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  datasets: [
    {
      label: 'Hashrate',
      data: [100, 35, 110, 105, 60, 115],
      borderColor: COLOR.SLEEP_BLUE,
    },
  ],
}
