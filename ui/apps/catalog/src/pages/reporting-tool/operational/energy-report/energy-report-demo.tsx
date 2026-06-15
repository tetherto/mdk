import type {
  EnergyReportContainer,
  EnergyReportDateRange,
  EnergyReportMinerTypeViewProps,
} from '@tetherto/mdk-react-devkit/foundation'
import { EnergyReport } from '@tetherto/mdk-react-devkit/foundation'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { useMemo, useState } from 'react'

import { DemoPageHeader } from '../../../../components/demo-page-header'

const NOW = Date.now()
const DAY_MS = 86_400_000

type DemoMiningUnit = {
  id: string
  nominalMinerCapacity: number
  activeMiners: number
  offline: number
  normal: number
  high: number
  low: number
}

/** Representative site layout for Mining Unit Power Summary cards. */
const DEMO_MINING_UNITS: DemoMiningUnit[] = [
  { id: 'BITDEER-4A', nominalMinerCapacity: 103, activeMiners: 36, offline: 0, normal: 32, high: 4, low: 0 },
  { id: 'BITDEER-4B', nominalMinerCapacity: 103, activeMiners: 36, offline: 1, normal: 30, high: 5, low: 0 },
  { id: 'BITDEER-5A', nominalMinerCapacity: 103, activeMiners: 36, offline: 5, normal: 31, high: 0, low: 0 },
  { id: 'BITDEER-5B', nominalMinerCapacity: 103, activeMiners: 36, offline: 0, normal: 34, high: 2, low: 0 },
  { id: 'BITDEER-9A', nominalMinerCapacity: 103, activeMiners: 36, offline: 0, normal: 36, high: 0, low: 0 },
  { id: 'BITDEER-9B', nominalMinerCapacity: 103, activeMiners: 36, offline: 2, normal: 28, high: 6, low: 0 },
  { id: 'BITDEER-10A', nominalMinerCapacity: 103, activeMiners: 36, offline: 0, normal: 33, high: 3, low: 0 },
  { id: 'BITDEER-10B', nominalMinerCapacity: 103, activeMiners: 36, offline: 0, normal: 35, high: 1, low: 0 },
  { id: 'BITMAIN-HYDRO-1', nominalMinerCapacity: 80, activeMiners: 28, offline: 0, normal: 24, high: 4, low: 0 },
  { id: 'BITMAIN-HYDRO-2', nominalMinerCapacity: 80, activeMiners: 0, offline: 0, normal: 0, high: 0, low: 0 },
  { id: 'BITMAIN-IMM-1', nominalMinerCapacity: 72, activeMiners: 24, offline: 1, normal: 20, high: 3, low: 0 },
  { id: 'BITMAIN-IMM-2', nominalMinerCapacity: 72, activeMiners: 24, offline: 0, normal: 22, high: 2, low: 0 },
  { id: 'M221-1', nominalMinerCapacity: 48, activeMiners: 18, offline: 0, normal: 16, high: 2, low: 0 },
  { id: 'MICROBT-1', nominalMinerCapacity: 50, activeMiners: 38, offline: 0, normal: 35, high: 3, low: 0 },
  { id: 'MICROBT-2', nominalMinerCapacity: 50, activeMiners: 38, offline: 2, normal: 32, high: 4, low: 0 },
]

const toContainerBucket = (
  units: DemoMiningUnit[],
  pick: (unit: DemoMiningUnit) => number,
): Record<string, number> => Object.fromEntries(units.map((unit) => [unit.id, pick(unit)]))

const MOCK_CONSUMPTION_LOG = Array.from({ length: 7 }, (_, i) => ({
  ts: NOW - (6 - i) * DAY_MS,
  powerW: (180 + i * 50) * 1_000_000,
  consumptionMWh: 4.2 + i * 0.5,
}))

const MOCK_TAIL_LOG = [
  [
    {
      type_cnt: { 'miner-am-s21': 120, 'miner-wm-m56': 80 },
      power_w_type_group_sum_aggr: { 'miner-am-s21': 45_000_000, 'miner-wm-m56': 30_000_000 },
      offline_type_cnt: { 'miner-am-s21': 2, 'miner-wm-m56': 1 },
      error_type_cnt: { 'miner-am-s21': 1, 'miner-wm-m56': 0 },
      power_mode_sleep_type_cnt: { 'miner-am-s21': 5, 'miner-wm-m56': 3 },
      power_mode_low_type_cnt: { 'miner-am-s21': 10, 'miner-wm-m56': 8 },
      power_mode_normal_type_cnt: { 'miner-am-s21': 90, 'miner-wm-m56': 60 },
      power_mode_high_type_cnt: { 'miner-am-s21': 12, 'miner-wm-m56': 8 },
      maintenance_type_cnt: { 'miner-am-s21': 3, 'miner-wm-m56': 2 },
      offline_cnt: toContainerBucket(DEMO_MINING_UNITS, (u) => u.offline),
      power_mode_low_cnt: toContainerBucket(DEMO_MINING_UNITS, (u) => u.low),
      power_mode_normal_cnt: toContainerBucket(DEMO_MINING_UNITS, (u) => u.normal),
      power_mode_high_cnt: toContainerBucket(DEMO_MINING_UNITS, (u) => u.high),
      hashrate_mhs_5m_active_container_group_cnt: toContainerBucket(
        DEMO_MINING_UNITS,
        (u) => u.activeMiners,
      ),
    },
  ],
]

type MockGroupedConsumption = NonNullable<EnergyReportMinerTypeViewProps['groupedConsumption']>

const MOCK_CONTAINERS: EnergyReportContainer[] = DEMO_MINING_UNITS.map((unit) => ({
  id: unit.id,
  type: 'container-demo',
  info: { container: unit.id, nominalMinerCapacity: String(unit.nominalMinerCapacity) },
}))

const MOCK_MINER_GROUPED: MockGroupedConsumption = {
  log: [
    {
      ts: NOW,
      powerW: {
        'miner-am-s21': 45_000_000,
        'miner-wm-m56s': 30_000_000,
        'miner-av-a1346': 12_000_000,
      },
      consumptionMWh: null,
    },
  ],
  summary: { avgPowerW: null, totalConsumptionMWh: 0 },
}

const MOCK_UNIT_GROUPED: MockGroupedConsumption = {
  log: [
    {
      ts: NOW,
      powerW: Object.fromEntries(
        DEMO_MINING_UNITS.map((unit, index) => [
          unit.id,
          (35 + index * 2) * 1_000_000,
        ]),
      ),
      consumptionMWh: null,
    },
  ],
  summary: { avgPowerW: null, totalConsumptionMWh: 0 },
}

const buildDefaultRange = (): EnergyReportDateRange => {
  const yesterday = subDays(new Date(), 1)

  return {
    start: startOfDay(subDays(yesterday, 6)).getTime(),
    end: endOfDay(yesterday).getTime(),
  }
}

export const EnergyReportDemo = () => {
  const defaultRange = useMemo(buildDefaultRange, [])
  const [siteRange, setSiteRange] = useState<EnergyReportDateRange>(defaultRange)

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Energy"
        description="Operational energy report — site consumption trend, power modes by miner type, and consumption by miner type / mining unit."
      />
      <EnergyReport
        siteView={{
          dateRange: siteRange,
          onDateRangeChange: setSiteRange,
          consumptionLog: MOCK_CONSUMPTION_LOG,
          nominalPowerAvailabilityMw: 600,
          tailLog: MOCK_TAIL_LOG,
          containers: MOCK_CONTAINERS,
          onRefetchSnapshot: () => undefined,
        }}
        minerTypeView={{
          groupedConsumption: MOCK_MINER_GROUPED,
          containers: MOCK_CONTAINERS,
          isLoading: false,
        }}
        minerUnitView={{
          groupedConsumption: MOCK_UNIT_GROUPED,
          containers: MOCK_CONTAINERS,
          isLoading: false,
        }}
      />
    </section>
  )
}
