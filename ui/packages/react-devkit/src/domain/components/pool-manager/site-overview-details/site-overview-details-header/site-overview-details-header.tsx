import { Button, cn, Indicator } from '@primitives'

import {
  SITE_OVERVIEW_STATUS_COLORS,
  SITE_OVERVIEW_STATUS_LABELS,
  SITE_OVERVIEW_STATUSES,
} from '../../pool-manager-constants'
import './site-overview-details-header.scss'

export type SiteOverviewDetailsHeaderProps = {
  poolName: string
  actualMinersCount: number
  containerHashRate: string
  isContainerRunning: boolean
  hasSelection: boolean
  onDeselectAll: VoidFunction
  onSelectAll: VoidFunction
}

export const SiteOverviewDetailsHeader = ({
  poolName,
  actualMinersCount,
  containerHashRate,
  isContainerRunning,
  hasSelection,
  onDeselectAll,
  onSelectAll,
}: SiteOverviewDetailsHeaderProps) => {
  const containerStatus = isContainerRunning
    ? SITE_OVERVIEW_STATUSES.MINING
    : SITE_OVERVIEW_STATUSES.OFFLINE

  return (
    <div className="mdk-sod-header">
      <div className="mdk-sod-header__info">
        <div className="mdk-sod-header__col">
          <span className="mdk-sod-header__label">Pool</span>
          <span className="mdk-sod-header__value">{poolName}</span>
        </div>

        <div className="mdk-sod-header__col">
          <span className="mdk-sod-header__label">Miners</span>
          <span
            className={cn(
              'mdk-sod-header__value',
              actualMinersCount > 0 && 'mdk-sod-header__value--active',
            )}
          >
            {actualMinersCount}
          </span>
        </div>

        <div className="mdk-sod-header__col">
          <span className="mdk-sod-header__label">Hashrate</span>
          <span className="mdk-sod-header__value">{containerHashRate}</span>
        </div>

        <div className="mdk-sod-header__col">
          <span className="mdk-sod-header__label">Status</span>
          <div className="mdk-sod-header__value">
            <Indicator color={SITE_OVERVIEW_STATUS_COLORS[containerStatus]} size="sm">
              {SITE_OVERVIEW_STATUS_LABELS[containerStatus]}
            </Indicator>
          </div>
        </div>
      </div>

      <div className="mdk-sod-header__actions">
        {hasSelection && (
          <Button size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
        )}
        <Button size="sm" onClick={onSelectAll}>
          Select All
        </Button>
      </div>
    </div>
  )
}
