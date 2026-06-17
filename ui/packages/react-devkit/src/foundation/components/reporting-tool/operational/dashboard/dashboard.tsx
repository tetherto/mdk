import { cn } from '@core'
import { useCallback, useEffect, useState } from 'react'

import {
  OPERATIONAL_DASHBOARD_CHART_IDS as IDS,
  type OperationalDashboardChartId,
} from './dashboard.constants'
import './dashboard.scss'
import type { OperationalDashboardProps } from './dashboard.types'
import { OperationalHashrateChart } from './hashrate-chart'
import { OperationalMinersStatusChart } from './miners-status-chart'
import { OperationalPowerConsumptionChart } from './power-consumption-chart'
import { OperationalSiteEfficiencyChart } from './site-efficiency-chart'

type ExpandedState = Partial<Record<OperationalDashboardChartId, boolean>>

/**
 * Module-level store so a chart's expanded state survives the composite
 * unmounting and remounting (e.g. route changes), matching the OSS dashboard.
 *
 * Assumes a single `OperationalDashboard` is mounted at a time (the intended
 * single-site usage). Concurrent instances would share - and clobber - this
 * state; switch to per-instance/keyed state if that need ever arises.
 */
const expandedChartsRef: { current: ExpandedState } = { current: {} }

/**
 * Operational dashboard - a 2x2 grid of the four site-operations charts
 * (hashrate, power consumption, site efficiency, miners status). Each card can
 * expand to full width; expand state persists across remounts. Thin glue:
 * pass pre-shaped data from `useOperationsDashboard` and an optional `controls`
 * slot (e.g. a date-range picker).
 *
 * @category dashboards
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @orkCapability energy-consumption
 * @orkCapability device-telemetry
 * @tier agent-ready
 */
export const OperationalDashboard = ({
  hashrate,
  consumption,
  efficiency,
  miners,
  controls,
}: OperationalDashboardProps) => {
  const [expanded, setExpanded] = useState<ExpandedState>(expandedChartsRef.current)

  useEffect(() => {
    expandedChartsRef.current = expanded
  }, [expanded])

  const toggle = useCallback(
    (id: OperationalDashboardChartId) =>
      setExpanded((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  )

  const cellClass = (id: OperationalDashboardChartId) =>
    cn(
      'mdk-operational-dashboard__cell',
      expanded[id] && 'mdk-operational-dashboard__cell--expanded',
    )

  return (
    <div className="mdk-operational-dashboard">
      {controls && <div className="mdk-operational-dashboard__controls">{controls}</div>}
      <div className="mdk-operational-dashboard__grid">
        <div className={cellClass(IDS.HASHRATE)}>
          <OperationalHashrateChart
            {...hashrate}
            isExpanded={!!expanded[IDS.HASHRATE]}
            onToggleExpand={() => toggle(IDS.HASHRATE)}
          />
        </div>
        <div className={cellClass(IDS.CONSUMPTION)}>
          <OperationalPowerConsumptionChart
            {...consumption}
            isExpanded={!!expanded[IDS.CONSUMPTION]}
            onToggleExpand={() => toggle(IDS.CONSUMPTION)}
          />
        </div>
        <div className={cellClass(IDS.EFFICIENCY)}>
          <OperationalSiteEfficiencyChart
            {...efficiency}
            isExpanded={!!expanded[IDS.EFFICIENCY]}
            onToggleExpand={() => toggle(IDS.EFFICIENCY)}
          />
        </div>
        <div className={cellClass(IDS.MINERS)}>
          <OperationalMinersStatusChart
            {...miners}
            isExpanded={!!expanded[IDS.MINERS]}
            onToggleExpand={() => toggle(IDS.MINERS)}
          />
        </div>
      </div>
    </div>
  )
}
