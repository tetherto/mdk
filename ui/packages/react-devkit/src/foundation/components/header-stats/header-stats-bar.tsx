import { cn, HeaderStatDividerIcon } from '@core'
import { Children, Fragment, type JSX, type ReactNode } from 'react'
import './header-stats-bar.scss'

export type HeaderStatsBarProps = {
  /** Stat boxes to render in order, left-to-right. */
  children: ReactNode
  /** Optional class hook. */
  className?: string
}

/**
 * Horizontal flex strip that hosts the dashboard's stat boxes
 * (HeaderMinersBox, HeaderHashrateBox, HeaderConsumptionBox,
 * HeaderEfficiencyBox). Lives inside `<AppHeader>` as the middle slot.
 *
 * Slot-based: the caller decides which boxes to render and in which
 * order. The bar interleaves an angled chevron divider between
 * adjacent children to match the Mining OS visual treatment.
 *
 * @category dashboard
 * @orkCapability site-overview
 * @domain mining-operations
 * @tier agent-ready
 */
export const HeaderStatsBar = ({ children, className }: HeaderStatsBarProps): JSX.Element => {
  const items = Children.toArray(children).filter(Boolean)

  return (
    <div className={cn('mdk-header-stats-bar', className)}>
      {Children.map(items, (child) => (
        <Fragment>
          <HeaderStatDividerIcon aria-hidden="true" className="mdk-header-stats-bar__divider" />
          {child}
        </Fragment>
      ))}
    </div>
  )
}

HeaderStatsBar.displayName = 'HeaderStatsBar'
