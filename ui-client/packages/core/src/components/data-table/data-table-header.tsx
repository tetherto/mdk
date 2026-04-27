import { TriangleDownIcon, TriangleUpIcon } from '@radix-ui/react-icons'
import type { Header, Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import React from 'react'
import { cn } from '../../utils'
import { SimpleTooltip } from '../tooltip'
import { columnIds } from './data-table.constants'

type TableHeaderProps<I> = {
  table: Table<I>
}

const SORT_ICON_SIZE = 24

export function TableHeader<I = unknown>({ table }: TableHeaderProps<I>): JSX.Element {
  const renderTableHeaderCell = (header: Header<I, unknown>): React.ReactNode => {
    const isSorted = header.column.getIsSorted()
    return (
      <th
        colSpan={header.colSpan}
        style={{
          width: header.getSize(),
        }}
        className={cn({
          sortable: header.column.getCanSort(),
          sorted: !!isSorted,
        })}
        onClick={header.column.getToggleSortingHandler()}
      >
        <div className="mdk-table-header-content">
          <span
            className={cn('mdk-table-header-subject', {
              'mdk-table-header-subject-checkbox': header.column.id === columnIds.rowSelection,
            })}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          <span className="mdk-table-header-sort" style={{ minWidth: SORT_ICON_SIZE }}>
            {{
              asc: <TriangleUpIcon height={SORT_ICON_SIZE} width={SORT_ICON_SIZE} />,
              desc: <TriangleDownIcon height={SORT_ICON_SIZE} width={SORT_ICON_SIZE} />,
            }[header.column.getIsSorted() as string] ?? null}
          </span>
        </div>
      </th>
    )
  }

  return (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <React.Fragment key={header.id}>
              {header.isPlaceholder ? null : header.column.getCanSort() ? (
                <SimpleTooltip
                  content={
                    {
                      asc: 'Sort ascending',
                      desc: 'Sort descending',
                    }[header.column.getNextSortingOrder() as string] ?? 'Clear sort'
                  }
                >
                  {renderTableHeaderCell(header)}
                </SimpleTooltip>
              ) : (
                renderTableHeaderCell(header)
              )}
            </React.Fragment>
          ))}
        </tr>
      ))}
    </thead>
  )
}
