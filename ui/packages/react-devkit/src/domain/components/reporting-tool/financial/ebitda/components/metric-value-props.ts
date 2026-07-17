export type MetricValueProps = {
  value: number | string
  unit: string
}

/** Map a numeric metric to display-ready value/unit, returning a dash for zero. */
export const metricValueProps = (value: number, unit: string): MetricValueProps =>
  value === 0 ? { value: '—', unit: '' } : { value, unit }
