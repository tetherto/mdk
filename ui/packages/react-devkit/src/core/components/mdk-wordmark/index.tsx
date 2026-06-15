import type { JSX } from 'react'

import { cn } from '../../utils'

import './mdk-wordmark.scss'

export type MdkWordmarkSize = 'sm' | 'md' | 'lg'

export type MdkWordmarkProps = {
  /** Visual size of the wordmark. `sm` ≈ 24px tall, `md` ≈ 32px, `lg` ≈ 64px. */
  size?: MdkWordmarkSize
  /** Optional class hook on the outer `<svg>`. */
  className?: string
  /** Accessible label. Defaults to "MDK". */
  title?: string
}

const SIZE_TO_HEIGHT: Record<MdkWordmarkSize, number> = {
  sm: 24,
  md: 32,
  lg: 64,
}

/**
 * MDK wordmark — the canonical brand lockup, rendered as inline SVG so it
 * tints to `currentColor`. Use this in `<AppHeader>` (via the `logo` slot)
 * or anywhere else the brand should appear.
 *
 * @category branding
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <MdkWordmark size="md" />
 * ```
 */
export const MdkWordmark = ({
  size = 'md',
  className,
  title = 'MDK',
}: MdkWordmarkProps): JSX.Element => {
  const height = SIZE_TO_HEIGHT[size]
  // viewBox preserves the proportions from the original SignIn wordmark
  // (500 × 112 ≈ ~4.46:1). At 32px height this renders ~143px wide.
  return (
    <svg
      className={cn('mdk-wordmark', `mdk-wordmark--${size}`, className)}
      viewBox="0 0 500 112"
      role="img"
      aria-label={title}
      height={height}
    >
      <title>{title}</title>
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontWeight="800"
        fontSize="96"
        letterSpacing="6"
        fill="currentColor"
      >
        MDK
      </text>
    </svg>
  )
}

MdkWordmark.displayName = 'MdkWordmark'
