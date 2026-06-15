import type { MouseEvent } from 'react'

import { Checkbox, Indicator } from '@core'

import {
  SITE_OVERVIEW_STATUS_COLORS,
  SITE_OVERVIEW_STATUS_LABELS,
  SITE_OVERVIEW_STATUSES,
} from '../pool-manager-constants'
import './sites-overview-status-card.scss'

const STATUS_DEFAULT = SITE_OVERVIEW_STATUSES.OFFLINE

export type SitesOverviewStatusCardProps = {
  id?: number
  unit: string
  pool?: string
  hashrate: string | number
  miners: string | number
  overrides?: number
  status?: keyof typeof SITE_OVERVIEW_STATUS_COLORS
  onSelect: (checked: boolean) => void
  onClick: VoidFunction
  checked: boolean
  selectable?: boolean
}

export const SitesOverviewStatusCard = ({
  unit,
  hashrate,
  miners,
  status = STATUS_DEFAULT,
  onSelect,
  onClick,
  checked,
  selectable = true,
  pool,
  overrides,
}: SitesOverviewStatusCardProps) => {
  const statusColor =
    SITE_OVERVIEW_STATUS_COLORS[status] ?? SITE_OVERVIEW_STATUS_COLORS[STATUS_DEFAULT]
  const statusLabel =
    SITE_OVERVIEW_STATUS_LABELS[status] ?? SITE_OVERVIEW_STATUS_LABELS[STATUS_DEFAULT]
  const hasOverrides = overrides != null && overrides > 0

  return (
    <div className="mdk-pm-status-card" onClick={onClick}>
      <div className="mdk-pm-status-card__header">
        <div className="mdk-pm-status-card__unit-info">
          {selectable && (
            <Checkbox
              checked={checked}
              color="primary"
              onCheckedChange={(val) => onSelect(val === true)}
              onClick={(e: MouseEvent) => e.stopPropagation()}
            />
          )}
          <span className="mdk-pm-status-card__unit-name">{unit}</span>
        </div>
        {/* TODO: Override status should be shown here once API is available */}
        <Indicator color={statusColor} className="mdk-pm-status-card__status-badge">
          {statusLabel}
        </Indicator>
      </div>

      <div className="mdk-pm-status-card__info-list">
        <div className="mdk-pm-status-card__info-item">
          Pool: <span>{pool}</span>
        </div>
        <div className="mdk-pm-status-card__info-item">
          Hashrate: <span>{hashrate}</span>
        </div>
        <div className="mdk-pm-status-card__info-item">
          Miners: <span>{miners}</span>
        </div>
        <div
          className={`mdk-pm-status-card__info-item ${hasOverrides ? 'mdk-pm-status-card__info-item--highlight' : ''}`}
        >
          Overrides: <span>{overrides}</span>
        </div>
      </div>
    </div>
  )
}
