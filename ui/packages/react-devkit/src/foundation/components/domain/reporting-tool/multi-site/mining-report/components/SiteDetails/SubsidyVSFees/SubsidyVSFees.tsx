import { CURRENCY, Mosaic, UNITS } from '@core'

import { type BarChartData, formatDataLabel } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'

type SubsidyVSFeesProps = {
  subsidyFees?: BarChartData
  avgFeesSats?: BarChartData
}

const SubsidyVSFees = ({ subsidyFees, avgFeesSats }: SubsidyVSFeesProps) => (
  <Mosaic template={['subsidy-fees', 'avg-fees']} gap="24px" rowHeight="1fr">
    <Mosaic.Item area="subsidy-fees">
      <ReportBarChart
        chartTitle="Subsidy/Fees"
        showDataLabels
        data={subsidyFees}
        isStacked
        yTicksFormatter={formatDataLabel}
        unit={CURRENCY.BTC_LABEL}
      />
    </Mosaic.Item>

    <Mosaic.Item area="avg-fees">
      <ReportBarChart
        chartTitle="Average Fees in Sats/vByte"
        showDataLabels
        data={avgFeesSats}
        isLegendVisible={false}
        yTicksFormatter={formatDataLabel}
        unit={`${UNITS.SATS}/${UNITS.VBYTE}`}
      />
    </Mosaic.Item>
  </Mosaic>
)

export default SubsidyVSFees
