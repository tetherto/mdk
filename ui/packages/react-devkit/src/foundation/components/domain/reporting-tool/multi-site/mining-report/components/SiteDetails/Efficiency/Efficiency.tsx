import { Mosaic, UNITS } from '@core'

import type { LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import { ReportLineChart } from '../../../report-charts/report-line-chart'

type EfficiencyProps = {
  timeframeType?: string
  efficiencyData: LineChartData
}

const Efficiency = ({ timeframeType, efficiencyData }: EfficiencyProps) => (
  <Mosaic template={[['chart']]} gap="16px" rowHeight="auto">
    <Mosaic.Item area="chart">
      <ReportLineChart
        title="Average Efficiency"
        data={efficiencyData}
        unit={UNITS.EFFICIENCY_W_PER_TH}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>
  </Mosaic>
)

export default Efficiency
