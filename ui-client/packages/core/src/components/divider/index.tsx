import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as React from 'react'
import { cn } from '../../utils'

export type DividerOrientation = 'horizontal' | 'vertical'
export type DividerType = 'solid' | 'dashed' | 'dotted'

export type DividerProps = {
  /** Line orientation */
  orientation?: DividerOrientation
  /** Line style */
  dashed?: boolean
  dotted?: boolean
  /** Text or node rendered in the middle of the divider */
  children?: React.ReactNode
  /** Horizontal alignment of the label */
  align?: 'left' | 'center' | 'right'
  /** Plain text style — no border around label */
  plain?: boolean
  /** Custom className */
  className?: string
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      orientation = 'horizontal',
      dashed = false,
      dotted = false,
      children,
      align = 'center',
      plain = false,
      className,
      ...props
    },
    ref,
  ) => {
    const lineType: DividerType = dotted ? 'dotted' : dashed ? 'dashed' : 'solid'
    const isVertical = orientation === 'vertical'
    const hasLabel = !!children && !isVertical

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        orientation={orientation}
        decorative
        className={cn(
          'mdk-divider',
          `mdk-divider--${orientation}`,
          `mdk-divider--${lineType}`,
          hasLabel && 'mdk-divider--with-label',
          hasLabel && `mdk-divider--label-${align}`,
          plain && 'mdk-divider--plain',
          className,
        )}
        {...props}
      >
        {hasLabel && <span className="mdk-divider__label">{children}</span>}
      </SeparatorPrimitive.Root>
    )
  },
)

Divider.displayName = 'Divider'
