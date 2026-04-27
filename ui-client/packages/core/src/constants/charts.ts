/** Default color palette for chart datasets (line, bar, area) */
export const defaultChartColors = [
  'hsl(25 95% 53%)', // primary orange
  'hsl(142 76% 64%)', // success green
  'hsl(217 91% 60%)', // blue
  'hsl(45 93% 47%)', // warning yellow
  'hsl(0 84% 60%)', // error red
] as const

export const CHART_LEGEND_OPACITY = {
  VISIBLE: 1,
  HIDDEN: 0.2,
  FILL_HIDDEN: 0.1,
} as const

// Performance Configuration
export const CHART_PERFORMANCE = {
  LARGE_DATASET_THRESHOLD: 100,
  DECIMATION_THRESHOLD: 200,
  ANIMATION_DURATION: 300,
  NO_ANIMATION_THRESHOLD: 500,
  SKIP_PARSING: true,
  NORMALIZE_DATA: false,
} as const

export const getChartAnimationConfig = (dataPointCount: number): false | { duration: number } => {
  if (dataPointCount > CHART_PERFORMANCE.NO_ANIMATION_THRESHOLD) {
    return false
  }
  if (dataPointCount > CHART_PERFORMANCE.LARGE_DATASET_THRESHOLD) {
    return {
      duration: 0,
    }
  }
  return {
    duration: CHART_PERFORMANCE.ANIMATION_DURATION,
  }
}

export const getDataDecimationConfig = (
  dataPointCount: number,
): { enabled: boolean; algorithm?: string } => {
  if (dataPointCount > CHART_PERFORMANCE.DECIMATION_THRESHOLD) {
    return {
      enabled: true,
      algorithm: 'lttb',
    }
  }
  return {
    enabled: false,
  }
}

export const LABEL_TO_IGNORE = [
  'label',
  'unit',
  'stackGroup',
  'legendColor',
  'labels',
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'fill',
  'period',
  'groupByRegion',
  // Additional Chart.js styling properties
  'tension',
  'pointRadius',
  'pointHoverRadius',
  'borderDash',
  'order',
  'stack',
  'hidden',
  'yAxisID',
  'xAxisID',
  'type',
] as const

export type ChartLegendOpacityKey = keyof typeof CHART_LEGEND_OPACITY
export type ChartLegendOpacityValue = (typeof CHART_LEGEND_OPACITY)[ChartLegendOpacityKey]
export type ChartPerformanceKey = keyof typeof CHART_PERFORMANCE
export type LabelToIgnoreValue = (typeof LABEL_TO_IGNORE)[number]
