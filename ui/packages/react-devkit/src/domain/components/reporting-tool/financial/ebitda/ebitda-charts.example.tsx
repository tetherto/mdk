import { EbitdaCharts } from '@tetherto/mdk-react-devkit'

export const EbitdaChartsExample = () => (
  <div className="mdk-example-row">
    <EbitdaCharts
      showEbitdaBarChart={true}
      ebitdaChartData={{ labels: [], datasets: [] } as never}
      btcDisplayData={{ labels: [], datasets: [] } as never}
      isLoading={false}
      hasBtcProducedAllZeros={false}
    />
  </div>
)
