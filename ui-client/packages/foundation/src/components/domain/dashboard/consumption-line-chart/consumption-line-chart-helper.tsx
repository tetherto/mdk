import type { UnknownRecord } from '@tetherto/core'
import { CHART_COLORS, ConsumptionIcon, formatUnit, formatValueUnit } from '@tetherto/core'
import { formatPowerConsumption, removeContainerPrefix } from '../../../../utils/device-utils'
import type { LineChartCardData } from '../../line-chart-card'

export type TailLogEntry = {
  ts?: number
  [key: string]: unknown
}

export type ConsumptionLineChartData = {
  data: TailLogEntry[]
  tag: string
  skipMinMaxAvg: boolean
  powerAttribute?: string
  totalTransformerConsumption?: boolean
  rawConsumptionW?: number | string
  label?: string
}
const CHART_LABELS = {
  TOTAL_MINER_CONSUMPTION: 'Total Miner Consumption',
  TOTAL_CONSUMPTION: 'Total Consumption',
}

export const getPowerBEAttribute = (tag: string, totalTransformerConsumption?: boolean): string => {
  if (tag.includes('container')) {
    return `container_power_w_aggr.${removeContainerPrefix(tag)}`
  }
  if (totalTransformerConsumption) return 'transformer_power_w'
  if (tag.includes('powermeter')) return 'site_power_w'
  return 'power_w_sum_aggr'
}

export const getNestedValue = (entry: UnknownRecord, path: string): number => {
  const parts = path.split('.')
  let current: unknown = entry
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return 0
    current = (current as UnknownRecord)[part]
  }
  return (current as number) || 0
}

export const buildConsumptionData = ({
  data,
  tag,
  skipMinMaxAvg = false,
  powerAttribute,
  totalTransformerConsumption,
  rawConsumptionW,
  label,
}: ConsumptionLineChartData): LineChartCardData => {
  const powerBEAttribute = powerAttribute || getPowerBEAttribute(tag, totalTransformerConsumption)

  let totalAvgConsumption = 0
  let minConsumption = Number.MAX_SAFE_INTEGER
  let maxConsumption = Number.MIN_SAFE_INTEGER
  const powerConsumptionData = []

  for (const entry of data) {
    const x = entry.ts ?? 0
    const y = getNestedValue(entry, powerBEAttribute)
    powerConsumptionData.push({ x, y })
    totalAvgConsumption += y
    if (y < minConsumption) minConsumption = y
    if (y > maxConsumption) maxConsumption = y
  }

  const lastEntry = data[data.length - 1]
  const lastValue = lastEntry ? getNestedValue(lastEntry, powerBEAttribute) : 0

  const currentValueW: number =
    powerBEAttribute === 'site_power_w' ? Number(rawConsumptionW ?? 0) : lastValue

  const formattedCurrent = formatPowerConsumption(currentValueW)
  const formattedLast = formatPowerConsumption(lastValue)

  return {
    yTicksFormatter: (value: number) => formatUnit(formatPowerConsumption(value)),
    highlightedValue: {
      value: formatValueUnit(formattedCurrent.value ?? 0),
      unit: formattedCurrent.unit,
    },
    minMaxAvg: skipMinMaxAvg
      ? undefined
      : {
          min: formatUnit(formatPowerConsumption(minConsumption)),
          max: formatUnit(formatPowerConsumption(maxConsumption)),
          avg: formatUnit(formatPowerConsumption(totalAvgConsumption / (data.length || 1))),
        },
    datasets: [
      {
        label:
          label ??
          (tag === 't-miner'
            ? CHART_LABELS.TOTAL_MINER_CONSUMPTION
            : CHART_LABELS.TOTAL_CONSUMPTION),
        data: powerConsumptionData,
        borderColor: CHART_COLORS.SKY_BLUE,
        legendIcon: <ConsumptionIcon />,
        currentValue: {
          value: formattedLast.value ?? 0,
          unit: formattedLast.unit,
        },
      },
    ],
  }
}
