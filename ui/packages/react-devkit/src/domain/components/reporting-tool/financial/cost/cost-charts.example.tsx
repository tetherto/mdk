import { CostCharts } from '@tetherto/mdk-react-devkit'

export const CostChartsExample = () => (
  <div className="mdk-example-row">
    <CostCharts costLog={[]} btcPriceLog={[]} totals={null} dateRange={null} isLoading={false} />
  </div>
)
