import { LineChartCard } from '../../../line-chart-card'

import { ChartExpandAction } from './chart-expand-action'
import { DASHBOARD_HASHRATE_UNIT, OPERATIONAL_DASHBOARD_CHART_HEIGHT } from './dashboard.constants'
import type { OperationalTrendChartProps } from './dashboard.types'

/**
 * Hashrate trend card for the operational dashboard. Renders the site hashrate
 * over time (TH/s) with an optional nominal reference line, plus an expand
 * toggle. Purely presentational - pass pre-shaped data from
 * `useOperationsDashboard`.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const OperationalHashrateChart = ({
  data,
  isLoading,
  isExpanded = false,
  onToggleExpand,
}: OperationalTrendChartProps) => (
  <LineChartCard
    title="Hashrate"
    data={data}
    isLoading={isLoading}
    minHeight={OPERATIONAL_DASHBOARD_CHART_HEIGHT}
    chartProps={{ unit: DASHBOARD_HASHRATE_UNIT }}
    headerAction={<ChartExpandAction isExpanded={isExpanded} onToggle={onToggleExpand} />}
  />
)
