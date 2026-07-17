import { useActions, useLiveActions } from '@tetherto/mdk-react-adapter'
import type { JSX, MouseEvent } from 'react'

import { ActionsTickIcon, cn } from '@primitives'

/** Clamp the displayed count to `99+`. */
const formatCount = (count: number): string => (count > 99 ? '99+' : String(count))

export type PendingActionsButtonProps = {
  /** Click handler override — defaults to toggling the actionsStore sidebar. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

/**
 * Header action tile showing the total count of pending actions
 * (local drafts + submitted voting actions + others' requests).
 * Clicking opens the {@link ActionsSidebar} via the shared `actionsStore` toggle.
 *
 * @category dashboards
 * @kernelCapability pool-performance
 * @domain mining-operations
 * @tier agent-ready
 */
export const PendingActionsButton = ({ onClick, className }: PendingActionsButtonProps): JSX.Element => {
  const { pendingSubmissions, setSidebarOpen } = useActions()
  const { myVoting, myReady, myExecuting, othersVoting } = useLiveActions()

  const total =
    pendingSubmissions.length +
    myVoting.length +
    myReady.length +
    myExecuting.length +
    othersVoting.length

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event)
    } else {
      setSidebarOpen(true)
    }
  }

  return (
    <div className={cn('mdk-pending-actions-button-group', className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Pending actions (${total})`}
        className="mdk-header-action-button mdk-pending-actions-button"
        title="Review pending actions"
      >
        <span className="mdk-pending-actions-button__count" aria-hidden="true">
          {formatCount(total)}
        </span>
        <span className="mdk-header-action-button__icon">
          <ActionsTickIcon size={16} />
        </span>
      </button>
    </div>
  )
}

PendingActionsButton.displayName = 'PendingActionsButton'
