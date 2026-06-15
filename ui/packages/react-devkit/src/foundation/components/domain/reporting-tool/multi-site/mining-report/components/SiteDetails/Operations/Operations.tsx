import { Mosaic, UNITS } from '@core'

import type { LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import { ReportLineChart } from '../../../report-charts/report-line-chart'

type OperationsProps = {
  timeframeType?: string
  hashrate?: LineChartData
  efficiency?: LineChartData
  workers?: LineChartData
  powerConsumption?: LineChartData
}

const Operations = ({
  timeframeType,
  hashrate,
  efficiency,
  workers,
  powerConsumption,
}: OperationsProps) => (
  <Mosaic
    template={['hashrate efficiency', 'workers power']}
    gap="24px"
    columns="1fr 1fr"
    rowHeight="1fr"
  >
    <Mosaic.Item area="hashrate">
      <ReportLineChart
        title="Hashrate"
        data={hashrate}
        unit={UNITS.HASHRATE_PH_S}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>

    <Mosaic.Item area="efficiency">
      <ReportLineChart
        title="Efficiency"
        data={efficiency}
        unit={UNITS.EFFICIENCY_W_PER_TH}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>

    <Mosaic.Item area="workers">
      <ReportLineChart title="Workers" data={workers} unit="" timeframeType={timeframeType} />
    </Mosaic.Item>

    <Mosaic.Item area="power">
      <ReportLineChart
        title="Power Consumption"
        data={powerConsumption}
        unit={UNITS.ENERGY_MW}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>
  </Mosaic>
)

export default Operations
