import type { ReactNode } from 'react'

export type DetailLegendItem = {
  /** Legend label text */
  label: string
  /** Color for the legend icon */
  color: string
  /** Custom icon to display (defaults to a colored square) */
  icon?: ReactNode
  /** Current value display */
  currentValue?: {
    value: number | string
    unit?: string
  }
  /** Percentage change indicator (positive = up, negative = down) */
  percentChange?: number | null
  /** Whether this legend item is hidden/dimmed */
  hidden?: boolean
}

export type DetailLegendProps = {
  /** Legend items to display */
  items: DetailLegendItem[]
  /** Callback when a legend item is toggled */
  onToggle?: (label: string, index: number) => void
  /** Custom class name */
  className?: string
}
