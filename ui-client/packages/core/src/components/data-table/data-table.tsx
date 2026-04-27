import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { MinusIcon, PlusIcon } from '@radix-ui/react-icons'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useMemo } from 'react'
import { cn } from '../../utils'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Pagination } from '../pagination'
import { Spinner } from '../spinner'
import { EmptyTableBody, TableBody } from './data-table-body'
import { TableHeader } from './data-table-header'
import { columnIds } from './data-table.constants'
import type {
  DataTableColumnDef,
  DataTableExpandedState,
  DataTablePaginationState,
  DataTableRow,
  DataTableRowSelectionState,
  DataTableSortingState,
} from './types'

export type DataTableProps<I = unknown> = {
  /**
   * The data to be shown in the table. See https://tanstack.com/table/v8/docs/guide/data
   */
  data: I[]
  /**
   * The column configuration table. See https://tanstack.com/table/v8/docs/guide/column-defs
   */
  columns: DataTableColumnDef<I, any>[]
  /**
   * Is table full width
   * @default true
   */
  fullWidth?: boolean
  /**
   * Show a checkbox column and enables selection
   * @default false
   */
  enableRowSelection?: boolean | ((row: DataTableRow<I>) => boolean)
  /**
   * Enables selection of multiple rows
   * @default true
   */
  enableMultiRowSelection?: boolean
  /**
   * Specify the selected rows. If `undefined`, the selections are managed internally
   * Object with the key of row ID and a boolean specifying if the row is selected.
   * The default row ID is the index. This can be changed using `getRowId` prop
   * @default undefined
   */
  selections?: DataTableRowSelectionState
  /**
   * Callback to be called when the row are selected / unselected
   */
  onSelectionsChange?: (selections: DataTableRowSelectionState) => void
  /**
   * Show pagination
   * @default true
   */
  enablePagination?: boolean
  /**
   * Add borders to all cells
   * @default false
   */
  bordered?: boolean

  /**
   * Specify the pagination params. Object of shape { pageIndex: number, pageSize: number }.
   * If `undefined` then the pagination is managed internally.
   * @default undefined
   */
  pagination?: DataTablePaginationState
  /**
   * Callback to be called when the pagination params change
   */
  onPaginationChange?: (pagination: DataTablePaginationState) => void
  /**
   * Specify the sorting params.
   * If `undefined` then the sorting is managed internally.
   * @default undefined
   */
  sorting?: DataTableSortingState
  /**
   * Callback to be called when the sorting changes
   */
  onSortingChange?: (sorting: DataTableSortingState) => void
  /**
   * Classname of the wrapper element
   */
  wrapperClassName?: string
  /**
   * Classname of the content element
   */
  contentClassName?: string
  /**
   * Classname of the table element
   */
  tableClassName?: string
  /**
   * Show a loading indicator overlay
   * @default false
   */
  loading?: boolean
  /**
   * Show a columns with a button which can expand the row
   * @default false
   */
  enableRowExpansion?: boolean
  /**
   * Callback to check if a row can be expanded
   * @default false
   */
  canRowExpand?: (row: DataTableRow<I>) => boolean
  /**
   * Specify the expanded rows
   * If `undefined`, the expansions are managed internally
   * Object with the key of row ID and a boolean specifying if the row is selected.
   * The default row ID is the index. This can be changed using `getRowId` prop
   */
  expandedRows?: DataTableExpandedState
  /**
   * Callback to be called when the rows are expanded or collapsed
   */
  onExpandedRowsChange?: (expandedRows: DataTableExpandedState) => void
  /**
   * Render the content of the expanded row. Required when `enableRowExpansion` is `true`
   */
  renderExpandedContent?: (row: DataTableRow<I>) => React.ReactNode
  /**
   * Get the row ID for a row. If not specified index is the default row ID.
   */
  getRowId?: (row: I, index: number, parent?: DataTableRow<I>) => string
}

const DEFAULT_PAGE_SIZE = 10

export function DataTable<I = unknown>({
  data,
  columns: providedColumns,
  fullWidth = true,
  enableRowSelection = false,
  selections: providedSelections,
  onSelectionsChange,
  enablePagination = true,
  enableMultiRowSelection = true,
  pagination: providedPagination,
  onPaginationChange,
  sorting: providedSorting,
  onSortingChange,
  wrapperClassName,
  contentClassName,
  tableClassName,
  loading,
  bordered = false,
  enableRowExpansion = false,
  canRowExpand = () => true,
  expandedRows: providedExpandedRows,
  onExpandedRowsChange,
  renderExpandedContent,
  getRowId,
}: DataTableProps<I>): JSX.Element {
  const [sorting, setSorting] = useControllableState<DataTableSortingState>({
    prop: providedSorting,
    defaultProp: [],
    onChange: onSortingChange,
  })

  const [pagination, setPagination] = useControllableState<DataTablePaginationState>({
    prop: providedPagination,
    defaultProp: {
      pageIndex: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    },
    onChange: onPaginationChange,
  })

  const [rowSelection, setRowSelection] = useControllableState<DataTableRowSelectionState>({
    prop: providedSelections,
    defaultProp: {},
    onChange: onSelectionsChange,
  })

  const [expandedRows, setExpandedRows] = useControllableState<DataTableExpandedState>({
    prop: providedExpandedRows,
    defaultProp: {},
    onChange: onExpandedRowsChange,
  })

  const tableLocalState = useMemo(() => {
    const localState = {
      sorting,
      rowSelection,
      ...(enablePagination ? { pagination } : {}),
      ...(enableRowExpansion ? { expanded: expandedRows } : {}),
    }

    return localState
  }, [sorting, rowSelection, enablePagination, pagination, enableRowExpansion, expandedRows])

  const columnHelper = createColumnHelper<I>()

  const columns = useMemo(
    () => [
      ...(enableRowExpansion
        ? [
            columnHelper.display({
              id: columnIds.rowExpansion,
              header: '',
              cell: ({ row }) => (
                <Button
                  variant="icon"
                  onClick={row.getToggleExpandedHandler()}
                  icon={row.getIsExpanded() ? <MinusIcon /> : <PlusIcon />}
                />
              ),
              maxSize: 50,
            }),
          ]
        : []),
      ...(enableRowSelection
        ? [
            columnHelper.display({
              id: columnIds.rowSelection,
              header: ({ table }) => {
                let checked: boolean | 'indeterminate' = false

                if (table.getIsSomePageRowsSelected()) {
                  checked = 'indeterminate'
                } else {
                  checked = table.getIsAllPageRowsSelected()
                }

                return (
                  <Checkbox
                    size="sm"
                    checked={checked}
                    onCheckedChange={(value) => {
                      if (typeof value === 'boolean') {
                        table.toggleAllPageRowsSelected(value)
                      }
                    }}
                  />
                )
              },
              cell: ({ row }) => (
                <div className="mdk-table-body__row-selection">
                  <Checkbox
                    size="sm"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onCheckedChange={row.getToggleSelectedHandler()}
                  />
                </div>
              ),
              maxSize: 50,
            }),
          ]
        : []),
      ...providedColumns,
    ],
    [providedColumns, enableRowSelection],
  )

  const tableBackend = useReactTable({
    // Basic Options
    data,
    columns,
    getRowId,

    // Pagination
    onPaginationChange: setPagination,

    // Sorting
    onSortingChange: setSorting,

    // Selections
    enableRowSelection,
    enableMultiRowSelection,
    onRowSelectionChange: setRowSelection,

    // Expansion
    getRowCanExpand: canRowExpand,
    onExpandedChange: setExpandedRows,

    // Table State
    state: tableLocalState,

    // Pipeline
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getExpandedRowModel: getExpandedRowModel(),
  })

  const handlePageChange = (pageNumber: number): void => {
    tableBackend.setPageIndex(pageNumber - 1)
  }

  const handlePageSizeChange = (pageNumber: number, size: number): void =>
    tableBackend.setPagination({
      ...pagination,
      pageIndex: pageNumber - 1,
      pageSize: size,
    })

  const hasData = Boolean(data.length)
  const showPagination = enablePagination && hasData

  return (
    <div className={cn('mdk-table', wrapperClassName)}>
      <div className="mdk-table-content-wrapper">
        <div
          className={cn(
            'mdk-table__content-section',
            {
              'mdk-table__content-section--empty': !hasData,
              'mdk-table__content-section--no-overflow': !hasData || loading,
              'mdk-table__content-section--bordered': bordered,
            },
            contentClassName,
          )}
        >
          <table
            className={cn('mdk-table__element', tableClassName, {
              'mdk-table__element--width-full': fullWidth,
              'mdk-table__element--bordered': bordered,
            })}
            style={{
              minWidth: tableBackend.getCenterTotalSize(),
            }}
          >
            <TableHeader table={tableBackend} />
            {hasData && (
              <TableBody table={tableBackend} renderExpandedContent={renderExpandedContent} />
            )}
          </table>
          {loading && (
            <div className="mdk-table__loader-overlay">
              <Spinner />
            </div>
          )}
        </div>
        {!hasData && <EmptyTableBody hideContent={loading} />}
      </div>
      {showPagination && (
        <div className="mdk-table__pagination-section">
          <Pagination
            total={data.length}
            current={pagination.pageIndex + 1}
            onChange={handlePageChange}
            pageSize={pagination.pageSize}
            onSizeChange={handlePageSizeChange}
            disabled={loading}
          />
        </div>
      )}
    </div>
  )
}

export { createColumnHelper as getDataTableColumnHelper } from '@tanstack/react-table'
