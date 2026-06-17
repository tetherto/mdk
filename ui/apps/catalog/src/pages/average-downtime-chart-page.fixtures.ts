import type { AverageDowntimeChartData } from '@tetherto/mdk-react-devkit/core'

export const AVERAGE_DOWNTIME_SAMPLE: AverageDowntimeChartData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  curtailment: [0.02, 0.015, 0.03, 0.01, 0.02, 0.005, 0.01],
  operationalIssues: [0.05, 0.04, 0.06, 0.035, 0.045, 0.02, 0.03],
}

export const AVERAGE_DOWNTIME_CURTAILMENT_ONLY: AverageDowntimeChartData = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  curtailment: [0.025, 0.018, 0.022, 0.012],
  operationalIssues: [0, 0, 0, 0],
}

export const AVERAGE_DOWNTIME_ALL_ZEROS: AverageDowntimeChartData = {
  labels: ['Mon', 'Tue', 'Wed'],
  curtailment: [0, 0, 0],
  operationalIssues: [0, 0, 0],
}

export const AVERAGE_DOWNTIME_NO_PERIODS: AverageDowntimeChartData = {
  labels: [],
  curtailment: [],
  operationalIssues: [],
}
