import { SimpleTooltip } from '@core'

import { LineChartCard } from '../../../line-chart-card'

import { ChartExpandAction } from './chart-expand-action'
import {
  DASHBOARD_EFFICIENCY_UNIT,
  OPERATIONAL_DASHBOARD_CHART_HEIGHT,
  SITE_EFFICIENCY_INFO,
} from './dashboard.constants'
import type { OperationalTrendChartProps } from './dashboard.types'

const InfoGlyph = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

/**
 * Site-efficiency trend card for the operational dashboard. Renders measured
 * site efficiency over time (W/TH/s) with an optional nominal reference line,
 * an info tooltip, and an expand toggle. Purely presentational - pass
 * pre-shaped data from `useOperationsDashboard`.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const OperationalSiteEfficiencyChart = ({
  data,
  isLoading,
  isExpanded = false,
  onToggleExpand,
}: OperationalTrendChartProps) => (
  <LineChartCard
    title="Site Efficiency"
    titleExtra={
      <SimpleTooltip content={SITE_EFFICIENCY_INFO}>
        <span className="mdk-operational-dashboard__info" aria-label="About site efficiency">
          <InfoGlyph />
        </span>
      </SimpleTooltip>
    }
    data={data}
    isLoading={isLoading}
    minHeight={OPERATIONAL_DASHBOARD_CHART_HEIGHT}
    chartProps={{ unit: DASHBOARD_EFFICIENCY_UNIT, beginAtZero: true }}
    headerAction={<ChartExpandAction isExpanded={isExpanded} onToggle={onToggleExpand} />}
  />
)
