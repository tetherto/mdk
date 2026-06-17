import { LineChartCard } from '../../../line-chart-card'

import { ChartExpandAction } from './chart-expand-action'
import {
  DASHBOARD_CONSUMPTION_UNIT,
  OPERATIONAL_DASHBOARD_CHART_HEIGHT,
} from './dashboard.constants'
import type { OperationalTrendChartProps } from './dashboard.types'

/**
 * Power-consumption trend card for the operational dashboard. Renders site
 * power draw over time (MW) with an optional power-availability reference line,
 * plus an expand toggle. Purely presentational - pass pre-shaped data from
 * `useOperationsDashboard`.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const OperationalPowerConsumptionChart = ({
  data,
  isLoading,
  isExpanded = false,
  onToggleExpand,
}: OperationalTrendChartProps) => (
  <LineChartCard
    title="Power Consumption"
    data={data}
    isLoading={isLoading}
    minHeight={OPERATIONAL_DASHBOARD_CHART_HEIGHT}
    chartProps={{ unit: DASHBOARD_CONSUMPTION_UNIT }}
    headerAction={<ChartExpandAction isExpanded={isExpanded} onToggle={onToggleExpand} />}
  />
)
