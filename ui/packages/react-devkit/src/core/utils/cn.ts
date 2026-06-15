import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'

/**
 * Utility function to merge class names using clsx
 *
 * @param inputs - Class names to merge
 * @returns Merged class string
 *
 * @example
 * ```ts
 * cn('base-class', condition && 'conditional-class', { 'object-class': true })
 * ```
 */
export const cn = (...inputs: ClassValue[]): string => {
  return clsx(inputs)
}
