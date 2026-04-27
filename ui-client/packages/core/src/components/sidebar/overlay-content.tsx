import { useCallback, useState } from 'react'
import { MenuItemInternal } from './menu-item'

import type { OverlayContentProps, SidebarMenuItem } from './types'

export const OverlayContent = ({
  items,
  activeId,
  onItemClick,
}: OverlayContentProps): React.ReactNode => {
  const [localOverlayId, setLocalOverlayId] = useState<string | null>(null)

  const handleItemClick = useCallback(
    (clicked: SidebarMenuItem) => {
      setLocalOverlayId(null)
      onItemClick?.(clicked)
    },
    [onItemClick],
  )

  return (
    <>
      {items.map((child) => (
        <MenuItemInternal
          depth={1}
          inOverlay
          item={child}
          key={child.id}
          isExpanded={false}
          activeId={activeId}
          overlayId={localOverlayId}
          onItemClick={handleItemClick}
          onOverlayChange={setLocalOverlayId}
        />
      ))}
    </>
  )
}

OverlayContent.displayName = 'OverlayContent'
