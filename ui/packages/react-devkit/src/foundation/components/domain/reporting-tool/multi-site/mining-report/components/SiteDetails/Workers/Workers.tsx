import { Mosaic } from '@core'

import type { LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import { ReportLineChart } from '../../../report-charts/report-line-chart'

type WorkersProps = {
  timeframeType?: string
  workersData?: LineChartData
}

const Workers = ({ timeframeType, workersData }: WorkersProps) => (
  <Mosaic template={[['only']]} rowHeight="auto">
    <Mosaic.Item area="only">
      <ReportLineChart title="Workers" data={workersData} timeframeType={timeframeType} />
    </Mosaic.Item>
  </Mosaic>
)

export default Workers
