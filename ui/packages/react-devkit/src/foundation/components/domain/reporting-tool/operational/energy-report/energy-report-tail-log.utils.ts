import type { EnergyReportTailLogItem, EnergyReportTailLogNumericBucket } from './energy-report.types'

export const isEnergyReportTailLogNumericBucket = (
  value: unknown,
): value is EnergyReportTailLogNumericBucket =>
  value != null && typeof value === 'object' && !Array.isArray(value)

export const readEnergyReportTailLogHead = (
  tailLog: EnergyReportTailLogItem[][] | undefined,
): EnergyReportTailLogItem | undefined => tailLog?.[0]?.[0]

export const readEnergyReportTailLogNumericBucket = (
  tailLogItem: EnergyReportTailLogItem | null | undefined,
  bucketKey: string,
): EnergyReportTailLogNumericBucket => {
  if (!tailLogItem) return {}
  const bucket = tailLogItem[bucketKey]
  return isEnergyReportTailLogNumericBucket(bucket) ? bucket : {}
}

export const readEnergyReportTailLogBucketMetric = (
  tailLogItem: EnergyReportTailLogItem | null | undefined,
  bucketKey: string,
  dimensionKey: string,
): number => {
  const bucket = readEnergyReportTailLogNumericBucket(tailLogItem, bucketKey)
  return bucket[dimensionKey] ?? 0
}
