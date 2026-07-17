import { BitcoinProducedChart } from '@tetherto/mdk-react-devkit'

export const BitcoinProducedChartExample = () => (
  <div className="mdk-example-row">
    <BitcoinProducedChart chartData={{ labels: [], datasets: [] } as never} isLoading={false} />
  </div>
)
