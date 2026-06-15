import { Mosaic, UNITS } from '@core'

import type { LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import { ReportLineChart } from '../../../report-charts/report-line-chart'

type PowerConsumptionProps = {
  timeframeType?: string
  powerData?: LineChartData
}

const PowerConsumption = ({ timeframeType, powerData }: PowerConsumptionProps) => (
  <Mosaic template={[['only']]} rowHeight="auto">
    <Mosaic.Item area="only">
      <ReportLineChart
        title="Power Consumption"
        data={powerData}
        unit={UNITS.ENERGY_MW}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>
  </Mosaic>
)

export default PowerConsumption
