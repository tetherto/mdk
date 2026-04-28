import { cn } from '@tetherto/mdk-core-ui'
import {
  POOL_VALIDATION_STATUS_LABELS,
  POOL_VALIDATION_STATUSES,
} from '../../pool-manager-constants'
import type { PoolSummary } from '../../types'
import './pool-collapse-item-header.scss'

type PoolCollapseItemHeaderProps = {
  pool: PoolSummary
}

export const PoolCollapseItemHeader = ({
  pool: { name, validation, description, units, miners },
}: PoolCollapseItemHeaderProps) => {
  const isPoolValidated = validation?.status === POOL_VALIDATION_STATUSES.TESTED

  return (
    <div className="mdk-pm-pool-header">
      <div className="mdk-pm-pool-header__title-section">
        <span className="mdk-pm-pool-header__title">{name}</span>
        <span className="mdk-pm-pool-header__subtitle">{description}</span>
      </div>

      <div className="mdk-pm-pool-header__miner-count">
        {Boolean(units) && `${units} Units`} {Boolean(miners) && `${miners} Miners`}
      </div>

      {validation && (
        <span
          className={cn(
            'mdk-pm-pool-header__validation',
            isPoolValidated
              ? 'mdk-pm-pool-header__validation--valid'
              : 'mdk-pm-pool-header__validation--invalid',
          )}
        >
          {POOL_VALIDATION_STATUS_LABELS[
            validation.status as keyof typeof POOL_VALIDATION_STATUS_LABELS
          ] ?? validation.status}
        </span>
      )}
    </div>
  )
}
