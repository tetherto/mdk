import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as React from 'react'

import { ChevronDownIcon, ChevronRightIcon, MinusIcon, PlusIcon } from '@radix-ui/react-icons'
import { cn } from '../../utils'

const AccordionRoot = AccordionPrimitive.Root

type TAccordionToggleIconPosition = 'left' | 'right'

type AccordionProps = {
  title: string
  isRow?: boolean
  isOpened?: boolean
  unpadded?: boolean
  noBorder?: boolean
  showToggleIcon?: boolean
  solidBackground?: boolean
  customLabel?: React.ReactNode
  toggleIconPosition?: TAccordionToggleIconPosition
  onValueChange?: (value: string | string[]) => void
} & Omit<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>,
  'collapsible' | 'type' | 'defaultValue' | 'value' | 'onValueChange'
>

/**
 * Accordion Item component
 *
 * @example
 * ```tsx
 * <AccordionItem value="item-1">
 *   <AccordionTrigger>Title</AccordionTrigger>
 *   <AccordionContent>Content</AccordionContent>
 * </AccordionItem>
 * ```
 */
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn('mdk-accordion__item', className)} {...props} />
))
AccordionItem.displayName = 'AccordionItem'

/**
 * Accordion Trigger component (header/button)
 *
 * @example
 * ```tsx
 * <AccordionTrigger>Click to expand</AccordionTrigger>
 * <AccordionTrigger showToggleIcon={false} customLabel={<Badge>New</Badge>}>
 *   Title with custom label
 * </AccordionTrigger>
 * ```
 */
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    timestamp?: string
    showToggleIcon?: boolean
    toggleIconPosition?: TAccordionToggleIconPosition
    customLabel?: React.ReactNode
  }
>(
  (
    {
      className,
      children,
      toggleIconPosition = 'left',
      showToggleIcon = true,
      customLabel,
      ...props
    },
    ref,
  ) => (
    <AccordionPrimitive.Header className="mdk-accordion__header">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn('mdk-accordion__trigger', className)}
        {...props}
      >
        <div className="mdk-accordion__trigger-left">
          {showToggleIcon && toggleIconPosition === 'left' && (
            <div className="mdk-accordion__toggler">
              <ChevronDownIcon className="mdk-accordion__icon--minus" />
              <ChevronRightIcon className="mdk-accordion__icon--plus" />
            </div>
          )}
          <span className="mdk-accordion__title">{children}</span>
        </div>
        <div className="mdk-accordion__trigger-right">
          {customLabel && toggleIconPosition !== 'right' && (
            <div className="mdk-accordion__custom-label">{customLabel}</div>
          )}
          {showToggleIcon && toggleIconPosition === 'right' && (
            <div className="mdk-accordion__toggler">
              <MinusIcon className="mdk-accordion__icon--minus" />
              <PlusIcon className="mdk-accordion__icon--plus" />
            </div>
          )}
        </div>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  ),
)
AccordionTrigger.displayName = 'AccordionTrigger'

/**
 * Accordion Content component (collapsible content area)
 *
 * @example
 * ```tsx
 * <AccordionContent>
 *   <p>Your content here</p>
 * </AccordionContent>
 * ```
 */
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content ref={ref} className="mdk-accordion__content" {...props}>
    <div className={cn('mdk-accordion__content-inner', className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = 'AccordionContent'

/**
 * Accordion Root component
 *
 * @example
 * ```tsx
 * // Basic accordion
 * <Accordion title="FAQ">
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>Question 1</AccordionTrigger>
 *     <AccordionContent>Answer 1</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 *
 * // With timestamp
 * <Accordion title="Foundry EU Primary" timestamp="2025-01-15 14:32">
 *   <p>Content here</p>
 * </Accordion>
 *
 * // With custom label
 * <Accordion
 *   title="Basic Opened Accordion"
 *   customLabel={<Badge variant="success">Active</Badge>}
 *   showToggleIcon={false}
 * >
 *   <p>Content here</p>
 * </Accordion>
 * ```
 */
const Accordion = ({
  title = '',
  children,
  isRow = false,
  isOpened = false,
  unpadded = false,
  noBorder = false,
  solidBackground = false,
  showToggleIcon = true,
  toggleIconPosition = 'left',
  customLabel,
  onValueChange,
  className,
  ...props
}: React.PropsWithChildren<AccordionProps>): React.ReactElement => {
  const itemValue = 'accordion-item'

  return (
    <AccordionPrimitive.Root
      type="multiple"
      defaultValue={isOpened ? [itemValue] : []}
      onValueChange={onValueChange}
      className={cn(
        'mdk-accordion',
        solidBackground && 'mdk-accordion--solid-background',
        className,
      )}
      {...props}
    >
      <AccordionItem value={itemValue}>
        <AccordionTrigger
          showToggleIcon={showToggleIcon}
          customLabel={customLabel}
          toggleIconPosition={toggleIconPosition}
          className={cn(noBorder && 'mdk-accordion__trigger--no-border')}
        >
          {title}
        </AccordionTrigger>
        <AccordionContent
          className={cn(
            unpadded && 'mdk-accordion__content-inner--no-padding',
            isRow && 'mdk-accordion__content-inner--row',
          )}
        >
          {children}
        </AccordionContent>
      </AccordionItem>
    </AccordionPrimitive.Root>
  )
}

Accordion.displayName = 'Accordion'

export { Accordion, AccordionContent, AccordionItem, AccordionRoot, AccordionTrigger }
