import { CHART_COLORS } from '../../constants/colors'
import { UNITS } from '../../constants/units'

export const DEFAULT = {
  height: 280, // in pixels
  barWidth: 38, // in pixels
  unit: UNITS.PERCENT,
  title: 'Monthly Average Downtime',
}

export const STACK_ID = 'DT'

export const SERIES = {
  curtailment: {
    label: 'Curtailment',
    color: CHART_COLORS.VIOLET,
  },
  operationalIssues: {
    label: 'Op. Issues',
    color: CHART_COLORS.SKY_BLUE,
  },
} as const
