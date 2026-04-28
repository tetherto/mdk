import { Button, Divider } from '@tetherto/core'
import { formatDistance } from 'date-fns/formatDistance'

import { ArrowRightIcon } from '@radix-ui/react-icons'
import type { Alert } from '../../device-explorer'
import { MAX_ALERTS_DISPLAYED, navigationBlocks } from './dashboard-constants'
import type { DashboardStats } from './dashboard-types'
import './styles.scss'

export type DashboardProps = {
  stats?: DashboardStats
  isStatsLoading?: boolean
  alerts?: Alert[]
  onNavigationClick: (url: string) => void
  onViewAllAlerts: VoidFunction
}

export const PoolManagerDashboard = ({
  stats,
  isStatsLoading = false,
  alerts = [],
  onNavigationClick,
  onViewAllAlerts,
}: DashboardProps) => {
  const visibleAlerts = alerts.slice(0, MAX_ALERTS_DISPLAYED)

  return (
    <div className="mdk-pm-dashboard">
      {!isStatsLoading && stats && (
        <>
          <div className="mdk-pm-dashboard__stat-blocks">
            {stats.items.map((stat) => (
              <div key={stat.label} className="mdk-pm-dashboard__stat-block">
                <div className="mdk-pm-dashboard__stat-header">
                  <span className="mdk-pm-dashboard__stat-label">{stat.label}</span>
                  {stat.type && (
                    <span
                      className="mdk-pm-dashboard__stat-status"
                      data-type={stat.type.toLowerCase()}
                    />
                  )}
                </div>
                <div className="mdk-pm-dashboard__stat-value-row">
                  <span className="mdk-pm-dashboard__stat-value">{stat.value}</span>
                  {stat.secondaryValue && (
                    <span className="mdk-pm-dashboard__stat-secondary">
                      {'/ '}
                      {stat.secondaryValue}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Divider />
        </>
      )}

      {/* ── Navigation blocks ─────────────────────────────────────────────── */}

      <div className="mdk-pm-dashboard__nav-blocks">
        {navigationBlocks.map((block) => (
          <div key={block.title} className="mdk-pm-dashboard__nav-block">
            <div className="mdk-pm-dashboard__nav-header">
              <div className="mdk-pm-dashboard__nav-icon">{block.icon}</div>
              <span className="mdk-pm-dashboard__nav-title">{block.title}</span>
            </div>
            <p className="mdk-pm-dashboard__nav-description">{block.description}</p>
            <button
              type="button"
              className="mdk-pm-dashboard__nav-action"
              onClick={() => onNavigationClick?.(block.url)}
            >
              <span>{block.navText}</span>
              <ArrowRightIcon />
            </button>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── Alerts ───────────────────────────────────────────────────────── */}

      <div className="mdk-pm-dashboard__alerts-wrapper">
        <div className="mdk-pm-dashboard__alerts-title">Recent Alerts</div>

        {visibleAlerts.length === 0 ? (
          <div className="mdk-pm-dashboard__alerts-empty">No recent alerts</div>
        ) : (
          <div className="mdk-pm-dashboard__alerts">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id ?? alert.uuid ?? Math.random()}
                className="mdk-pm-dashboard__alert-row"
              >
                <div className="mdk-pm-dashboard__alert-text">
                  <span className="mdk-pm-dashboard__alert-status" data-severity={alert.severity} />
                  <span>
                    {alert.description} - Miner #{alert.code}
                  </span>
                </div>
                <span className="mdk-pm-dashboard__alert-time">
                  {formatDistance(new Date(), new Date(alert.createdAt))}
                </span>
              </div>
            ))}
          </div>
        )}

        <Button size="sm" onClick={onViewAllAlerts}>
          View All Alerts
        </Button>
      </div>
    </div>
  )
}
