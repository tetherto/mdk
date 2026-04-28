import type { TimelineChartData } from '@tetherto/foundation'

export const NOW = Date.now()
export const MIN_5 = 5 * 60 * 1000
export const HOUR = 60 * 60 * 1000

export const COLORS = {
  green: '#72f59e',
  yellow: '#ffc107',
  red: '#ef4444',
  blue: '#22afff',
  purple: '#8b5cf6',
}

export const generateBasicData = (): TimelineChartData => {
  const labels = ['Task A', 'Task B', 'Task C']
  const startTime = NOW - 2 * HOUR

  return {
    labels,
    datasets: [
      {
        label: 'In Progress',
        color: COLORS.blue,
        data: [
          { x: [startTime, startTime + 30 * MIN_5], y: 'Task A' },
          { x: [startTime + 20 * MIN_5, startTime + 50 * MIN_5], y: 'Task B' },
        ],
      },
      {
        label: 'Completed',
        color: COLORS.green,
        data: [
          { x: [startTime + 30 * MIN_5, startTime + 60 * MIN_5], y: 'Task A' },
          { x: [startTime + 50 * MIN_5, startTime + 80 * MIN_5], y: 'Task B' },
          { x: [startTime + 10 * MIN_5, startTime + 70 * MIN_5], y: 'Task C' },
        ],
      },
      {
        label: 'Blocked',
        color: COLORS.red,
        data: [{ x: [startTime + 70 * MIN_5, startTime + 90 * MIN_5], y: 'Task C' }],
      },
    ],
  }
}

export const generateMinerStatusData = (): TimelineChartData => {
  const miners = [
    'miner-rack1-1',
    'miner-rack1-2',
    'miner-rack1-3',
    'miner-rack2-1',
    'miner-rack2-2',
  ]
  const startTime = NOW - 4 * HOUR

  const statuses = ['normal', 'low', 'high', 'sleep'] as const
  const statusColors: Record<(typeof statuses)[number], string> = {
    normal: COLORS.green,
    low: COLORS.yellow,
    high: COLORS.purple,
    sleep: COLORS.blue,
  }

  const datasets: TimelineChartData['datasets'] = statuses.map((status) => ({
    label: status,
    color: statusColors[status],
    data: [],
  }))

  for (const miner of miners) {
    let currentTime = startTime
    let currentStatus = statuses[Math.floor(Math.random() * statuses.length)]!

    while (currentTime < NOW) {
      const duration = (30 + Math.random() * 60) * MIN_5
      const endTime = Math.min(currentTime + duration, NOW)

      const dataset = datasets.find((d) => d.label === currentStatus)
      if (dataset) {
        dataset.data.push({ x: [currentTime, endTime], y: miner })
      }

      currentTime = endTime
      const newStatusIndex = Math.floor(Math.random() * statuses.length)
      currentStatus = statuses[newStatusIndex]!
    }
  }

  return { labels: miners, datasets }
}

export const generateManyRowsData = (): TimelineChartData => {
  const rows = Array.from({ length: 20 }, (_, i) => `Row ${i + 1}`)
  const startTime = NOW - 3 * HOUR

  return {
    labels: rows,
    datasets: [
      {
        label: 'Active',
        color: COLORS.green,
        data: rows.map((row, i) => ({
          x: [startTime + i * 5 * MIN_5, startTime + (i + 10) * 5 * MIN_5] as [number, number],
          y: row,
        })),
      },
      {
        label: 'Idle',
        color: COLORS.yellow,
        data: rows
          .filter((_, i) => i % 3 === 0)
          .map((row, i) => ({
            x: [startTime + (i + 12) * 5 * MIN_5, startTime + (i + 20) * 5 * MIN_5] as [
              number,
              number,
            ],
            y: row,
          })),
      },
    ],
  }
}

export const DATA_BASIC = generateBasicData()
export const DATA_MINER_STATUS = generateMinerStatusData()
export const DATA_MANY_ROWS = generateManyRowsData()
export const DATA_EMPTY: TimelineChartData = { labels: [], datasets: [] }
