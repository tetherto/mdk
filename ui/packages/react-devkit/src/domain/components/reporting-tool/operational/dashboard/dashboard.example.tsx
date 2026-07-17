import {
  OperationalDashboard,
  useOperationsDashboard,
  type UseOperationsDashboardInput,
} from '@tetherto/mdk-react-devkit/domain'

const DAY = 24 * 60 * 60 * 1000
const START = 1_769_025_600_000

const trend = (base: number, step: number) =>
  Array.from({ length: 7 }, (_, i) => ({ ts: START + i * DAY, value: base + i * step }))

// Mock buckets in base units: hashrate MH/s, consumption W, efficiency W/TH/s.
const MOCK_INPUT: UseOperationsDashboardInput = {
  hashrate: { log: trend(95_000_000, 1_500_000), nominalValue: 110_000_000 },
  consumption: { log: trend(38_000_000, 400_000), nominalValue: 45_000_000 },
  efficiency: { log: trend(21, 0.3), nominalValue: 19 },
  miners: {
    log: Array.from({ length: 7 }, (_, i) => ({
      ts: START + i * DAY,
      online: 1200 - i * 4,
      error: 10 + i,
      offline: 8,
      sleep: 20,
      maintenance: 4,
    })),
  },
}

export const OperationalDashboardExample = () => {
  const viewModel = useOperationsDashboard(MOCK_INPUT)

  return (
    <div className="mdk-example-row">
      <OperationalDashboard {...viewModel} />
    </div>
  )
}
