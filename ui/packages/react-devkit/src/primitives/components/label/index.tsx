import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react'

type LabelRootProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
type LabelProps = LabelRootProps & {
  // Key prop re-declared from the Radix root so it surfaces in the generated docs
  // (type reuses Radix's via indexed access — cannot drift).
  /** Id of the input being labelled */
  htmlFor?: LabelRootProps['htmlFor']
}

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
const Label = forwardRef<ComponentRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn('mdk-label', className)} {...props} />
  ),
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
