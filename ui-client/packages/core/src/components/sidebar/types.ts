export type SidebarMenuItemBase = {
  id: string
  label: string
}

export type SidebarMenuItemOptions = Partial<{
  disabled: boolean
  icon: React.ReactNode
  items: SidebarMenuItem[]
}>

export type SidebarMenuItem = SidebarMenuItemBase & SidebarMenuItemOptions

export type SidebarOptions = Partial<{
  activeId: string
  expanded: boolean
  visible: boolean
  overlay: boolean
  className: string
  defaultExpanded: boolean
  header: React.ReactNode
}>

export type SidebarCallbacks = Partial<{
  onClose: VoidFunction
  onExpandedChange: (expanded: boolean) => void
  onItemClick: (item: SidebarMenuItem) => void
}>

export type SidebarProps = SidebarOptions &
  SidebarCallbacks & {
    items: SidebarMenuItem[]
  }

// Internal Types

export type MenuItemInternalOptions = Partial<{
  depth: number
  activeId: string
  inOverlay: boolean
}>

export type MenuItemInternalCallbacks = Partial<{
  onItemClick: (item: SidebarMenuItem) => void
}>

export type MenuItemInternalProps = MenuItemInternalOptions &
  MenuItemInternalCallbacks & {
    item: SidebarMenuItem
    isExpanded: boolean
    overlayId: string | null
    onOverlayChange: React.Dispatch<React.SetStateAction<string | null>>
  }

export type OverlayContentOptions = Partial<{
  activeId: string
}>

export type OverlayContentCallbacks = Partial<{
  onItemClick: (item: SidebarMenuItem) => void
}>

export type OverlayContentProps = OverlayContentOptions &
  OverlayContentCallbacks & {
    items: SidebarMenuItem[]
  }
