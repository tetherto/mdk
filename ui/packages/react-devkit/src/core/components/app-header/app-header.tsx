import type { JSX, ReactNode } from 'react'
import { cn } from '../../utils'
import './app-header.scss'

export type AppHeaderProps = {
  /** Left-most slot — typically the app's brand lockup / logo. */
  logo?: ReactNode
  /** Left-edge content — e.g. a sidebar collapse toggle button. */
  start?: ReactNode
  /** Middle slot — typically the dashboard's stats strip. */
  children?: ReactNode
  /** Right-edge action cluster — e.g. alarms bell, profile menu. */
  actions?: ReactNode
  /** Optional class hook for the outer `<header>` element. */
  className?: string
  /** Render the header sticky to the top of its scroll container. Defaults to `true`. */
  sticky?: boolean
}

/**
 * Generic top-bar shell with three slots: `start`, `children` (middle), and
 * `actions` (end). Renders a sticky dark surface; consumers compose any
 * content into the slots. The sidebar collapse toggle, brand logo, stats
 * strip, and action buttons are all caller-provided — this component owns
 * no domain.
 *
 * @category navigation
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <AppHeader
 *   start={<button onClick={toggleSidebar}>≡</button>}
 *   actions={<><AlarmsBellButton /> <ProfileMenu /></>}
 * >
 *   <HeaderStatsBar>…</HeaderStatsBar>
 * </AppHeader>
 * ```
 */
export const AppHeader = ({
  logo,
  start,
  children,
  actions,
  className,
  sticky = true,
}: AppHeaderProps): JSX.Element => (
  <header className={cn('mdk-app-header', sticky && 'mdk-app-header--sticky', className)}>
    {logo ? <div className="mdk-app-header__logo">{logo}</div> : null}
    {start ? <div className="mdk-app-header__start">{start}</div> : null}
    <div className="mdk-app-header__main">{children}</div>
    {actions ? <div className="mdk-app-header__actions">{actions}</div> : null}
  </header>
)

AppHeader.displayName = 'AppHeader'
