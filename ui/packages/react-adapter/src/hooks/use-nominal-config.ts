type GlobalConfig = {
  nominalSiteHashrate_MHS?: number
  nominalAvailablePowerMWh?: number
  nominalPowerConsumption_MW?: number
  nominalWeightedAvgEfficiency_WThs?: number
  nominalMinerCapacity?: number
  [key: string]: unknown
}

export type NominalConfig = {
  hashrate_MHS: number
  powerAvailability_MW: number
  powerConsumption_MW: number
  weightedAvgEfficiency: number
  minerCapacity: number
}

type UseNominalConfigInput = {
  globalConfig: GlobalConfig | GlobalConfig[] | null | undefined
}

const resolveConfig = (
  input: GlobalConfig | GlobalConfig[] | null | undefined,
): GlobalConfig | undefined => {
  if (!input) return undefined

  return Array.isArray(input) ? input[0] : input
}

/**
 * Normalises the raw `globalConfig` payload (single object or array — APIs
 * differ across environments) into a flat {@link NominalConfig} with sane
 * zero-defaults.
 *
 * Use this whenever a dashboard needs the nominal site hashrate / power /
 * efficiency to compute deltas against live telemetry.
 *
 * @category ui
 */
export const useNominalConfig = ({ globalConfig }: UseNominalConfigInput): NominalConfig => {
  const config = resolveConfig(globalConfig)

  return {
    hashrate_MHS: config?.nominalSiteHashrate_MHS ?? 0,
    powerAvailability_MW: config?.nominalAvailablePowerMWh ?? 0,
    powerConsumption_MW: config?.nominalPowerConsumption_MW ?? 0,
    weightedAvgEfficiency: config?.nominalWeightedAvgEfficiency_WThs ?? 0,
    minerCapacity: config?.nominalMinerCapacity ?? 0,
  }
}
