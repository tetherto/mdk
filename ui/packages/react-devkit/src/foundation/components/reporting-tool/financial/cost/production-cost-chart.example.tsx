import { ProductionCostChart } from '@tetherto/mdk-react-devkit'

export const ProductionCostChartExample = () => (
  <div className="mdk-example-row">
    <ProductionCostChart costLog={[]} btcPriceLog={[]} dateRange={null} isLoading={false} />
  </div>
)
