import * as TabsPrimitives from '@radix-ui/react-tabs'
import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

type TabsVariant = 'default' | 'side' | 'underline'

type TabsProps = ComponentPropsWithoutRef<typeof TabsPrimitives.Root> & {
  variant?: TabsVariant
}
type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitives.List> & {
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
