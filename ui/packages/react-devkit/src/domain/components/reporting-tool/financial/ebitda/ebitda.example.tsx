import { Ebitda } from '@tetherto/mdk-react-devkit'

export const EbitdaExample = () => (
  <div className="mdk-example-row">
    <Ebitda
      metrics={null}
      ebitdaChartInput={null}
      btcProducedChartInput={null}
      hasBtcProducedAllZeros={false}
      showEbitdaBarChart={true}
      currentBTCPrice={65000}
      datePicker={<span>Date picker</span>}
      hasDateSelection={true}
      isLoading={false}
    />
  </div>
)
