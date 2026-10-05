import * as TabsPrimitives from '@radix-ui/react-tabs'
import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

type TabsVariant = 'default' | 'side' | 'underline'

type TabsRootProps = ComponentPropsWithoutRef<typeof TabsPrimitives.Root>
type TabsProps = TabsRootProps & {
  variant?: TabsVariant
  // Key controlled-state props re-declared from the Radix root so they surface in
  // the generated docs with descriptions (types reuse Radix's via indexed access,
  // so this can never drift from or conflict with the underlying primitive).
  /** Controlled active tab value */
  value?: TabsRootProps['value']
  /** Uncontrolled initial active value */
  defaultValue?: TabsRootProps['defaultValue']
  /** Fired when the active tab changes */
  onValueChange?: TabsRootProps['onValueChange']
  /**
   * Keyboard navigation orientation
   * @default "horizontal"
   */
  orientation?: TabsRootProps['orientation']
}
type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitives.List> & {
  /**
   * `default` (baseline), `side` (left rail), or `underline` (per-tab underline indicator, white active label)
   * @default "default"
   */
  variant?: TabsVariant
}
type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitives.Trigger> & {
  variant?: TabsVariant
}
type TabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitives.Content>
/**
 * Tabs component for organizing content into panels
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="tab1">
 *   <TabsList>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">Tab 1 content</TabsContent>
 * </Tabs>
 * ```
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
const Tabs = forwardRef<HTMLDivElement, TabsProps>(({ className, ...props }, ref) => (
  <TabsPrimitives.Root ref={ref} className={cn('mdk_tabs', className)} {...props} />
))

Tabs.displayName = 'Tabs'

/**
 * Horizontal container holding the `<TabsTrigger>` buttons of a `<Tabs>` group.
 *
 * @category layout
 * @domain generic
 * @tier internal
 */
const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitives.List
      ref={ref}
      className={cn(
        'mdk_tabs__list',
        variant === 'side' && 'mdk_tabs__list--side',
        variant === 'underline' && 'mdk_tabs__list--underline',
        className,
      )}
      {...props}
    />
  ),
)

TabsList.displayName = 'TabsList'

/**
 * Single button inside `<TabsList>` that activates its corresponding `<TabsContent>` pane.
 *
 * @category layout
 * @domain generic
 * @tier internal
 */
const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitives.Trigger
      ref={ref}
      className={cn(
        'mdk_tabs__trigger',
        variant === 'side' && 'mdk_tabs__trigger--side',
        variant === 'underline' && 'mdk_tabs__trigger--underline',
        className,
      )}
      {...props}
    />
  ),
)

TabsTrigger.displayName = 'TabsTrigger'

/**
 * Pane rendered when its matching `<TabsTrigger>` is active; hidden otherwise.
 *
 * @category layout
 * @domain generic
 * @tier internal
 */
const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(({ className, ...props }, ref) => (
  <TabsPrimitives.Content ref={ref} className={cn('mdk_tabs__content', className)} {...props} />
))

TabsContent.displayName = 'TabsContent'

export { Tabs, TabsContent, TabsList, TabsTrigger }
