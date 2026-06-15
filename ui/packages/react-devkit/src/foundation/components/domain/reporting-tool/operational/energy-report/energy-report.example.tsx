/**
 * Runnable example for EnergyReport. Mock data only.
 */
import { EnergyReport } from '@tetherto/mdk-react-devkit'

const DAY_MS = 86_400_000

const mockConsumptionLog = [
  { ts: Date.now() - DAY_MS, powerW: 180_000_000, consumptionMWh: 4.3 },
  { ts: Date.now(), powerW: 220_000_000, consumptionMWh: 5.1 },
]

export const EnergyReportExample = () => (
  <EnergyReport
    siteView={{
      consumptionLog: mockConsumptionLog,
      nominalPowerAvailabilityMw: 500,
    }}
  />
)
