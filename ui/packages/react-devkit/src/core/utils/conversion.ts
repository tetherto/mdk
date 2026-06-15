/**
 * Unit conversion utilities
 *
 * Pure functions for converting between energy, power, hashrate,
 * pressure, and financial units.
 */

import type { CurtailmentResult, TransactionEntry, TransactionSum } from './types'
import { BTC_SATS, HASHRATE_PER_PHS, HOURS_IN_DAY, W_TO_MW } from './number'

// ============================================================================
// Energy / Power Conversions
// ============================================================================

/**
 * Apply a multiplier to an energy data value
 */
export const convertEnergy = (energyDataItem: number, multiplier = 1): number =>
  energyDataItem * multiplier

/**
 * Convert watts to megawatts
 */
export const toMW = (watts: number): number => watts / W_TO_MW

/**
 * Convert watts to megawatt-hours (assuming 24h period)
 */
export const toMWh = (watts: number): number => toMW(watts) * HOURS_IN_DAY

/**
 * Convert raw hashrate to PH/s
 */
export const toPHS = (hashrate: number): number => hashrate / HASHRATE_PER_PHS

/**
 * Convert a value to kilo units (divide by 1000)
 */
export const unitToKilo = (value: number): number => value / 1_000

// ============================================================================
// Pressure Conversion
// ============================================================================

/**
 * Convert pressure from MPa to Bar (multiply by 10)
 *
 * @returns The value in Bar, or 0 if the input is not a valid number
 */
export const convertMpaToBar = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value * 10
  }

  return 0
}

// ============================================================================
// Curtailment Calculation
// ============================================================================

/**
 * Calculate curtailment in MWh and curtailment rate for sites
 *
 * Curtailment represents the difference between nominal available power and actual used energy.
 *
 * Formulas:
 * - `powerConsumptionInMWh = powerConsumptionMW * hoursInPeriod`
 * - `curtailmentMWh = nominalAvailablePowerMWh - usedEnergyInMWh`
 * - `curtailmentRate = curtailmentMWh / powerConsumptionInMWh`
 *
 * If curtailment rate is negative (used energy exceeds nominal available), it is clamped to 0.
 *
 * @param usedEnergy - The actual used energy in Wh
 * @param nominalAvailablePowerMWh - The nominal available power in MWh for the period
 * @param powerConsumptionMW - The power consumption in MW
 * @param hoursInPeriod - The number of hours in the period
 */
export const calculateCurtailment = (
  usedEnergy: number,
  nominalAvailablePowerMWh: number,
  powerConsumptionMW: number,
  hoursInPeriod: number,
): CurtailmentResult => {
  const usedEnergyInMWh = toMWh(usedEnergy)
  const powerConsumptionInMWh = powerConsumptionMW * hoursInPeriod
  const curtailmentMWh = nominalAvailablePowerMWh - usedEnergyInMWh
  let curtailmentRate = curtailmentMWh / powerConsumptionInMWh

  if (curtailmentRate < 0) {
    curtailmentRate = 0
  }

  return { curtailmentMWh, curtailmentRate }
}

// ============================================================================
// Transaction Calculation
// ============================================================================

/**
 * Calculate transaction sum (revenue and fees) from minerpool transactions
 *
 * Handles both transaction formats:
 * - `changed_balance` format (newer)
 * - `satoshis_net_earned` format (older)
 */
export const calculateTransactionSum = (transactions: TransactionEntry[]): TransactionSum =>
  (transactions || []).reduce<TransactionSum>(
    (acc, tx) => {
      if (typeof tx?.changed_balance === 'number') {
        acc.revenueBTC += tx.changed_balance
        acc.feesBTC += tx.mining_extra?.tx_fee || 0
      } else if (typeof tx?.satoshis_net_earned === 'number') {
        acc.revenueBTC += tx.satoshis_net_earned / BTC_SATS
        acc.feesBTC +=
          typeof tx.fees_colected_satoshis === 'number' ? tx.fees_colected_satoshis / BTC_SATS : 0
      }

      return acc
    },
    { revenueBTC: 0, feesBTC: 0 },
  )
