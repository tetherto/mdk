import type { IndicatorColor } from '@tetherto/core'
import { COLOR, getDataTableColumnHelper } from '@tetherto/core'
import type { ReactNode } from 'react'

export type ThresholdTableRow = {
  key: number
  state: string
  range: string
  color: ReactNode
  flash: ReactNode
  sound: ReactNode
}

const columnHelper = getDataTableColumnHelper<ThresholdTableRow>()

/**
 * Common table columns configuration for threshold tables
 *
 * Defines the standard column structure used across all threshold forms:
 * - State: The threshold level name (e.g., "Critical Low", "Normal")
 * - Range: The value range for this threshold level
 * - Color: Visual color indicator for this level
 * - Flash: Whether this level triggers flashing UI
 * - Sound: Whether this level triggers sound alerts
 *
 * @returns Array of column definitions for TanStack Table
 */
export const getCommonTableColumns = (): ReturnType<typeof columnHelper.accessor>[] => [
  columnHelper.accessor('state', {
    header: 'State',
    cell: (info) => info.getValue(),
    size: 20, // percentage width equivalent
  }),
  columnHelper.accessor('range', {
    header: 'Range',
    cell: (info) => info.getValue(),
    size: 25,
  }),
  columnHelper.accessor('color', {
    header: 'Color',
    cell: (info) => info.getValue(),
    size: 15,
  }),
  columnHelper.accessor('flash', {
    header: 'Flash',
    cell: (info) => <div>{info.getValue()}</div>,
    size: 20,
  }),
  columnHelper.accessor('sound', {
    header: 'Sound',
    cell: (info) => <div>{info.getValue()}</div>,
    size: 20,
  }),
]

export type ColorMappingValue = {
  text: string
  color: IndicatorColor
}

export type ColorMapping = Record<string, ColorMappingValue>

/**
 * Common color mapping for threshold states
 *
 * Maps color values to their display properties:
 * - text: Human-readable color name
 * - background: Background color for the color indicator
 * - textColor: Text color for the color indicator
 *
 * This ensures consistent color display across all threshold tables.
 *
 * @returns Object mapping color codes to display properties
 *
 * @example
 * ```ts
 * const colorMapping = getCommonColorMapping()
 * const redInfo = colorMapping[COLOR.RED]
 * console.log(redInfo.text) // "Red"
 * console.log(redInfo.color) // "red"
 * ```
 */
export const getCommonColorMapping = (): ColorMapping => ({
  [COLOR.RED]: {
    text: 'Red',
    color: 'red',
  },
  [COLOR.BRICK_RED]: {
    text: 'Red',
    color: 'red',
  },
  [COLOR.ORANGE]: {
    text: 'Orange',
    color: 'amber',
  },
  [COLOR.COLD_ORANGE]: {
    text: 'Orange',
    color: 'amber',
  },
  [COLOR.GREEN]: {
    text: 'Green',
    color: 'green',
  },
  [COLOR.LIGHT_GREEN]: {
    text: 'Green',
    color: 'green',
  },
  [COLOR.GRASS_GREEN]: {
    text: 'Green',
    color: 'green',
  },
  [COLOR.YELLOW]: {
    text: 'Yellow',
    color: 'yellow',
  },
  [COLOR.YELLOW_DARK]: {
    text: 'Yellow',
    color: 'yellow',
  },
  [COLOR.GOLD]: {
    text: 'Yellow',
    color: 'yellow',
  },
  [COLOR.WHITE]: {
    text: 'White',
    color: 'slate',
  },
})
