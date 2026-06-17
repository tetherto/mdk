import { ArchiveIcon } from '@radix-ui/react-icons'
import { flexRender } from '@tanstack/react-table'
import type { Row, Table } from '@tanstack/react-table'
import { cn } from '../../utils'
import { Fragment, type JSX, type ReactNode } from 'react'

import { SkeletonBlock } from '../skeleton'
import { getTableCellAlignClassName } from './data-table-cell-align'

export type TableBodyProps<I = unknown> = {
  table: Table<I>
  renderExpandedContent?: (row: Row<I>) => ReactNode
}

export const TableBody = <I = unknown,>({
  table,
  renderExpandedContent,
}: TableBodyProps<I>): JSX.Element => (
  <tbody>
    {table.getRowModel().rows.map((row) => (
      <Fragment key={row.id}>
        <tr
          className={cn('mdk-table__body-row', {
            'mdk-table__body-row--selected': row.getIsSelected(),
          })}
        >
          {row.getVisibleCells().map((cell) => {
            const align = cell.column.columnDef.meta?.align

            return (
            <td
              key={cell.id}
              style={{ width: cell.column.getSize() }}
              className={getTableCellAlignClassName(align)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
            )
          })}
        </tr>

        {row.getIsExpanded() && (
          <tr>
            <td colSpan={row.getAllCells().length}>{renderExpandedContent?.(row)}</td>
          </tr>
        )}
      </Fragment>
    ))}
  </tbody>
)

// Cycled so adjacent cells get different bar lengths — reads as "text of
// varying width" rather than a uniform grid.
const SKELETON_CELL_WIDTHS = ['85%', '55%', '70%', '45%']

export const SkeletonTableBody = ({
  columnCount,
  rowCount = 5,
}: {
  columnCount: number
  rowCount?: number
}): JSX.Element => (
  <tbody aria-hidden>
    {Array.from({ length: rowCount }, (_, rowIndex) => (
      <tr key={rowIndex} className="mdk-table__body-row mdk-table__body-row--skeleton">
        {Array.from({ length: columnCount }, (_, cellIndex) => (
          <td key={cellIndex}>
            <SkeletonBlock
              height={14}
              width={SKELETON_CELL_WIDTHS[(rowIndex + cellIndex) % SKELETON_CELL_WIDTHS.length]}
            />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
)

export const EmptyTableBody = ({
  description = 'No data present',
  hideContent,
}: {
  description?: string
  hideContent?: boolean
}): JSX.Element => {
  return (
    <div
      className={cn('mdk-table__empty-body-wrapper', {
        'mdk-table__empty-body--hidden': hideContent,
      })}
    >
      {!hideContent && (
        <div className="mdk-table__empty-body">
          <ArchiveIcon width="128px" height="128px" />
          <p>{description}</p>
        </div>
      )}
    </div>
  )
}
