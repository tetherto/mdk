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
  /** Currently active item id */
  activeId: string
  /** Controlled expanded state */
  expanded: boolean
  /**
   * Hide entirely without unmounting
   * @default true
   */
  visible: boolean
  /**
   * Show as fixed overlay with backdrop
   * @default false
   */
  overlay: boolean
  /** Additional class names */
  className: string
  /**
   * Initial expanded state
   * @default false
   */
  defaultExpanded: boolean
  /** Header content (e.g. logo, app name) */
  header: React.ReactNode
}>

export type SidebarCallbacks = Partial<{
  /** Called when the backdrop or ESC closes */
  onClose: VoidFunction
  /** Setter for the expanded state */
  onExpandedChange: (expanded: boolean) => void
  /** Item-click handler */
  onItemClick: (item: SidebarMenuItem) => void
}>

export type SidebarProps = SidebarOptions &
  SidebarCallbacks & {
    /** Menu items (supports nested `items`) */
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
