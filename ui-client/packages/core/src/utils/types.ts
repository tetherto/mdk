/**
 * Shared type definitions for utility functions
 */

// ============================================================================
// Value/Unit Types
// ============================================================================

export type ValueUnit = {
  value: number | string | null
  unit: string
  realValue: number
}

export type HashrateUnit = ValueUnit & {
  unit: string
}

export type CurrencyUnit = ValueUnit & {
  unit: string
}

// ============================================================================
// Unit Label Types
// ============================================================================

export type UnitLabel = 'decimal' | 'k' | 'M' | 'G' | 'T' | 'P'

// ============================================================================
// Error Types
// ============================================================================

export type ErrorWithTimestamp = {
  msg?: string
  message?: string
  timestamp?: number | string
}

// ============================================================================
// Time Range Types
// ============================================================================

export type TimeRangeFormatted = {
  start: string
  end: string
  formatted: string
}

export type TimeInterval = {
  start: number
  end: number
}

// ============================================================================
// Weighted Average Types
// ============================================================================

export type WeightedAverageResult = {
  avg: number
  totalWeight: number
  weightedValue: number
}

export type WeightedDataPoint = {
  value: number
  weight: number
}

// ============================================================================
// Chart Legend Position Type
// ============================================================================

export type ChartLegendPosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'chartArea'

// ============================================================================
// Curtailment Types
// ============================================================================

export type CurtailmentResult = {
  curtailmentMWh: number
  curtailmentRate: number
}

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionEntry = {
  changed_balance?: number
  satoshis_net_earned?: number
  fees_colected_satoshis?: number
  mining_extra?: { tx_fee?: number }
}

export type TransactionSum = {
  revenueBTC: number
  feesBTC: number
}
