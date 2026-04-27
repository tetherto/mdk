import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'

import { cn } from '../../utils'

/**
 * Label component for form fields
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <input id="email" type="email" />
 * ```
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('mdk-label', className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
