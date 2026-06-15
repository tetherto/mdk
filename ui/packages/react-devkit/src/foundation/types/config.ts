export type GlobalConfig = {
  nominalSiteHashrate_MHS?: number
  nominalAvailablePowerMWh?: number
  nominalPowerConsumption_MW?: number
  nominalWeightedAvgEfficiency_WThs?: number
  nominalMinerCapacity?: number
  isAutoSleepAllowed?: boolean
  siteEnergyDataThresholdMWh?: number
  [key: string]: unknown
}
