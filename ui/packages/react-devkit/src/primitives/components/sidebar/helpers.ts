import type { SidebarMenuItem } from './types'

export const hasActiveDescendant = (item: SidebarMenuItem, activeId?: string): boolean =>
  !!activeId &&
  (item.id === activeId ||
    item.items?.some((child) => hasActiveDescendant(child, activeId)) === true)

export const getFirstLeaf = (item: SidebarMenuItem): SidebarMenuItem =>
  item.items?.length ? getFirstLeaf(item.items[0]!) : item
