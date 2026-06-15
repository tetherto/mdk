import { CostMetrics } from '@tetherto/mdk-react-devkit'

export const CostMetricsExample = () => (
  <div className="mdk-example-row">
    <CostMetrics metrics={{ allIn: 42.5, energy: 38.0, operations: 4.5 } as never} />
  </div>
)
