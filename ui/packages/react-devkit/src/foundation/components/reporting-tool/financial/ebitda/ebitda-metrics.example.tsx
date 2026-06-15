import { EbitdaMetrics } from '@tetherto/mdk-react-devkit'

export const EbitdaMetricsExample = () => (
  <div className="mdk-example-row">
    <EbitdaMetrics
      metrics={{ actual: 125000, hodl: 198000, selling: 175000, cost: 50000 } as never}
      currentBTCPrice={65000}
    />
  </div>
)
