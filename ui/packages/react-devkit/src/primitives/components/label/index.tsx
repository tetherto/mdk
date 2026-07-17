import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react'

/**
 * Accessible text label for form controls. Associates with an input via `htmlFor` and supports a required-mark indicator. Built on Radix Label.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <input id="email" type="email" />
 * ```
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const Label = forwardRef<
  ComponentRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('mdk-label', className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
