import { BarChart, ChartContainer } from '@core'

import { ChartExpandAction } from './chart-expand-action'
import { OPERATIONAL_DASHBOARD_CHART_HEIGHT } from './dashboard.constants'
import type { OperationalMinersStatusChartProps } from './dashboard.types'

const EMPTY_BAR_DATA = { labels: [], datasets: [] }

const formatCount = (value: number): string => String(Math.round(value))

/**
 * Miners-status card for the operational dashboard. Renders a stacked daily
 * breakdown of miner states (online / error / offline / sleep / maintenance)
 * with an expand toggle. Purely presentational - pass pre-shaped data from
 * `useOperationsDashboard`.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const OperationalMinersStatusChart = ({
  data,
  isLoading,
  isExpanded = false,
  onToggleExpand,
}: OperationalMinersStatusChartProps) => {
  const hasData = (data?.datasets?.length ?? 0) > 0

  return (
    <ChartContainer
      title="Miners Status"
      headerAction={<ChartExpandAction isExpanded={isExpanded} onToggle={onToggleExpand} />}
      loading={isLoading}
      empty={!isLoading && !hasData}
      emptyMessage="No miners data available"
    >
      <BarChart
        data={data ?? EMPTY_BAR_DATA}
        isStacked
        legendPosition="bottom"
        height={OPERATIONAL_DASHBOARD_CHART_HEIGHT}
        formatYLabel={formatCount}
      />
    </ChartContainer>
  )
}
