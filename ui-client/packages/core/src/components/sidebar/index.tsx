import { useCallback, useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { cn } from '../../utils'
import type { SidebarProps } from './types'
import { MenuItemInternal } from './menu-item'
import { useSidebarExpandedState } from './use-sidebar-state'

export type {
  SidebarCallbacks,
  SidebarMenuItem,
  SidebarMenuItemBase,
  SidebarMenuItemOptions,
  SidebarOptions,
  SidebarProps,
} from './types'

export {
  clearSidebarState,
  useSidebarExpandedState,
  useSidebarSectionState,
} from './use-sidebar-state'

const Sidebar = ({
  items,
  onClose,
  expanded,
  activeId,
  className,
  onItemClick,
  visible = true,
  overlay = false,
  onExpandedChange,
  defaultExpanded = false,
  header,
}: SidebarProps): React.ReactNode => {
  const [overlayId, setOverlayId] = useState<string | null>(null)
  const [persistedExpanded, setPersistedExpanded] = useSidebarExpandedState(defaultExpanded)
  const [internalExpanded, setInternalExpanded] = useState(persistedExpanded)

  const showBackdrop = overlay && visible
  const isControlled = expanded !== undefined
  const isExpanded = overlay || (isControlled ? expanded : internalExpanded)

  const handleToggle = useCallback((): void => {
    if (overlay) {
      onClose?.()
      return
    }

    const newExpanded = !isExpanded
    if (!isControlled) {
      setInternalExpanded(newExpanded)
      setPersistedExpanded(newExpanded)
    }
    onExpandedChange?.(newExpanded)
  }, [overlay, onClose, isExpanded, isControlled, onExpandedChange, setPersistedExpanded])

  useEffect(() => {
    if (!showBackdrop) return

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showBackdrop, onClose])

  return (
    <>
      {showBackdrop && <div className="mdk-sidebar__backdrop" onClick={onClose} />}

      <nav
        className={cn(
          'mdk-sidebar',
          isExpanded && 'mdk-sidebar--expanded',
          !visible && 'mdk-sidebar--hidden',
          overlay && 'mdk-sidebar--overlay',
          showBackdrop && 'mdk-sidebar--overlay-visible',
          header && 'mdk-sidebar--with-header',
          className,
        )}
      >
        {header && <div className="mdk-sidebar__header">{header}</div>}

        <button
          type="button"
          className="mdk-sidebar__toggle"
          onClick={handleToggle}
          aria-label={
            overlay ? 'Close sidebar' : isExpanded ? 'Collapse sidebar' : 'Expand sidebar'
          }
        >
          {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>

        <div className="mdk-sidebar__menu">
          {items.map((item) => (
            <MenuItemInternal
              key={item.id}
              item={item}
              activeId={activeId}
              isExpanded={isExpanded}
              onItemClick={onItemClick}
              overlayId={overlayId}
              onOverlayChange={setOverlayId}
            />
          ))}
        </div>
      </nav>
    </>
  )
}

Sidebar.displayName = 'Sidebar'

export { Sidebar }
