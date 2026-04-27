import * as TabsPrimitives from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn } from '../../utils'

type TabsVariant = 'default' | 'side'

type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitives.Root> & {
  variant?: TabsVariant
}
type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitives.List> & {
  variant?: TabsVariant
}
type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitives.Trigger> & {
  variant?: TabsVariant
}
type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitives.Content>
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
 */
const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(({ className, ...props }, ref) => (
  <TabsPrimitives.Root ref={ref} className={cn('mdk_tabs', className)} {...props} />
))

Tabs.displayName = 'Tabs'

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitives.List
      ref={ref}
      className={cn('mdk_tabs__list', variant === 'side' && 'mdk_tabs__list--side', className)}
      {...props}
    />
  ),
)

TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitives.Trigger
      ref={ref}
      className={cn(
        'mdk_tabs__trigger',
        variant === 'side' && 'mdk_tabs__trigger--side',
        className,
      )}
      {...props}
    />
  ),
)

TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitives.Content ref={ref} className={cn('mdk_tabs__content', className)} {...props} />
  ),
)

TabsContent.displayName = 'TabsContent'

export { Tabs, TabsContent, TabsList, TabsTrigger }
