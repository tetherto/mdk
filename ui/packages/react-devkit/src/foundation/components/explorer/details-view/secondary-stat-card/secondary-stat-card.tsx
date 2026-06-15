import { cn } from '@core'
import type { ReactElement } from 'react'
import './secondary-stat-card.scss'

type SecondaryStatCardProps = {
  /** Stat name/label */
  name?: string
  /** Stat value */
  value?: string | number
  /** Custom className */
  className?: string
}

/**
 * Compact stat tile rendered alongside a primary stat to provide supporting context.
 *
 * Displays a secondary statistic with a name and value in a card format.
 *
 * @example
 * ```tsx
 * <SecondaryStatCard name="Hashrate" value="95.5 TH/s" />
 * <SecondaryStatCard name="Uptime" value={99.8} />
 * <SecondaryStatCard name="Efficiency" value="92%" />
 * ```
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const SecondaryStatCard = ({
  name = '',
  value = '',
  className,
}: SecondaryStatCardProps): ReactElement => {
  return (
    <div className={cn('mdk-secondary-stat-card', className)}>
      <div className="mdk-secondary-stat-card__name">{name}</div>
      <div className="mdk-secondary-stat-card__value">{value}</div>
    </div>
  )
}
