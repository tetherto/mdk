import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataTable, getDataTableColumnHelper } from '..'
import { EmptyTableBody, TableBody } from '../data-table-body'
import { TableHeader } from '../data-table-header'
import type { Table } from '@tanstack/react-table'

type Row = { id: string; name: string; value: number }

const sampleData: Row[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
  { id: '3', name: 'Gamma', value: 30 },
]

const columnHelper = getDataTableColumnHelper<Row>()

const basicColumns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('value', {
    header: 'Value',
    cell: (info) => info.getValue(),
  }),
]

describe('dataTable', () => {
  it('renders table with data and columns', () => {
    render(<DataTable data={sampleData} columns={basicColumns} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('renders empty state when data is empty', () => {
    render(<DataTable data={[]} columns={basicColumns} />)

    expect(screen.getByText('No data present')).toBeInTheDocument()
  })

  it('shows loading overlay when loading is true', () => {
    const { container } = render(<DataTable data={sampleData} columns={basicColumns} loading />)

    expect(container.querySelector('.mdk-table__loader-overlay')).toBeInTheDocument()
  })

  it('applies fullWidth class when fullWidth is true', () => {
    const { container } = render(<DataTable data={sampleData} columns={basicColumns} fullWidth />)

    expect(container.querySelector('.mdk-table__element--width-full')).toBeInTheDocument()
  })

  it('applies custom wrapper and table classNames', () => {
    const { container } = render(
      <DataTable
        data={sampleData}
        columns={basicColumns}
        wrapperClassName="custom-wrapper"
        tableClassName="custom-table"
      />,
    )

    expect(container.querySelector('.mdk-table.custom-wrapper')).toBeInTheDocument()
    expect(container.querySelector('.mdk-table__element.custom-table')).toBeInTheDocument()
  })
})

describe('dataTable with row selection', () => {
  it('renders checkbox column when enableRowSelection is true', () => {
    render(<DataTable data={sampleData} columns={basicColumns} enableRowSelection />)

    const checkboxes = document.querySelectorAll('[role="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('calls onSelectionsChange when selection changes', () => {
    const onSelectionsChange = vi.fn()
    render(
      <DataTable
        data={sampleData}
        columns={basicColumns}
        enableRowSelection
        onSelectionsChange={onSelectionsChange}
      />,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]!)

    expect(onSelectionsChange).toHaveBeenCalled()
  })
})

describe('dataTable with pagination', () => {
  const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
    id: String(i + 1),
    name: `Item ${i + 1}`,
    value: i + 1,
  }))

  it('shows pagination when page count is greater than 1', () => {
    render(<DataTable data={manyRows} columns={basicColumns} enablePagination />)

    expect(screen.getByRole('button', { name: /2/ })).toBeInTheDocument()
  })

  it('hides pagination when enablePagination is false', () => {
    const { container } = render(
      <DataTable data={manyRows} columns={basicColumns} enablePagination={false} />,
    )

    expect(container.querySelector('.mdk-table__pagination-section')).not.toBeInTheDocument()
  })
})

describe('dataTable with row expansion', () => {
  it('renders expand button and expanded content when enableRowExpansion is true', () => {
    render(
      <DataTable
        data={sampleData}
        columns={basicColumns}
        enableRowExpansion
        renderExpandedContent={(row) => <span>Expanded: {row.original.name}</span>}
      />,
    )

    const expandButtons = screen.getAllByRole('button')
    const firstExpand = expandButtons.find((b) => b.querySelector('svg'))
    expect(firstExpand).toBeDefined()

    fireEvent.click(firstExpand!)

    expect(screen.getByText('Expanded: Alpha')).toBeInTheDocument()
  })
})

describe('dataTable sorting', () => {
  it('renders sortable column headers', () => {
    const sortableColumns = [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => info.getValue(),
        enableSorting: true,
      }),
      columnHelper.accessor('value', {
        header: 'Value',
        cell: (info) => info.getValue(),
      }),
    ]

    render(<DataTable data={sampleData} columns={sortableColumns} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})

describe('tableBody', () => {
  it('renders rows from table model', () => {
    const table = {
      getRowModel: () => ({
        rows: [
          {
            id: '0',
            getVisibleCells: () => [
              {
                id: '0-name',
                column: { columnDef: { cell: () => 'Cell1' }, getSize: () => 100 },
                getContext: () => ({}),
              },
            ],
            getIsSelected: () => false,
            getIsExpanded: () => false,
            getAllCells: () => [{ id: '0-name' }],
          },
        ],
      }),
    } as unknown as Table<Row>

    const { container } = render(<TableBody table={table} />)

    expect(container.querySelector('tbody')).toBeInTheDocument()
    expect(container.querySelector('.mdk-table__body-row')).toBeInTheDocument()
    expect(screen.getByText('Cell1')).toBeInTheDocument()
  })

  it('renders expanded content when row is expanded', () => {
    const table = {
      getRowModel: () => ({
        rows: [
          {
            id: '0',
            getVisibleCells: () => [
              {
                id: '0-name',
                column: { columnDef: { cell: () => 'Main' }, getSize: () => 100 },
                getContext: () => ({}),
              },
            ],
            getIsSelected: () => false,
            getIsExpanded: () => true,
            getAllCells: () => [{ id: '0-name' }],
          },
        ],
      }),
    } as unknown as Table<Row>

    render(<TableBody table={table} renderExpandedContent={() => <span>Expanded content</span>} />)

    expect(screen.getByText('Expanded content')).toBeInTheDocument()
  })
})

describe('emptyTableBody', () => {
  it('renders default description', () => {
    render(<EmptyTableBody />)
    expect(screen.getByText('No data present')).toBeInTheDocument()
  })

  it('renders custom description', () => {
    render(<EmptyTableBody description="No items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('hides content when hideContent is true', () => {
    const { container } = render(<EmptyTableBody hideContent />)

    expect(container.querySelector('.mdk-table__empty-body--hidden')).toBeInTheDocument()
    expect(screen.queryByText('No data present')).not.toBeInTheDocument()
  })
})

describe('tableHeader', () => {
  it('renders header cells from table model', () => {
    const table = {
      getHeaderGroups: () => [
        {
          id: '0',
          headers: [
            {
              id: 'name',
              colSpan: 1,
              getSize: () => 100,
              column: {
                getIsSorted: () => false,
                getCanSort: () => false,
                getToggleSortingHandler: () => undefined,
                columnDef: { header: 'Name' },
                getNextSortingOrder: () => null,
              },
              getContext: () => ({}),
              isPlaceholder: false,
            },
          ],
        },
      ],
    } as unknown as Table<Row>

    const { container } = render(<TableHeader table={table} />)

    expect(container.querySelector('thead')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})
