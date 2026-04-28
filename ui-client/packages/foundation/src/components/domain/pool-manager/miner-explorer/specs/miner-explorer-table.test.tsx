import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MinerStatuses } from '../../../../../constants/device-constants'
import type { MinerRecord } from '../../types'
import type { MinerExplorerTableProps } from '../miner-explorer-table'
import { MinerExplorerTable } from '../miner-explorer-table'

const mockGetMinerTableColumns = vi.fn(() => [
  { accessorKey: 'code', header: 'Miner Code' },
  { accessorKey: 'status', header: 'Status' },
])

vi.mock('../miner-explorer-columns', () => ({
  getMinerTableColumns: () => mockGetMinerTableColumns(),
}))

const mockDataTable = vi.fn(({ wrapperClassName, loading, data }) => (
  <div
    data-testid="data-table"
    data-loading={String(loading ?? false)}
    data-row-count={data?.length ?? 0}
    className={wrapperClassName}
  />
))

vi.mock('@tetherto/core', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('@tetherto/core')>()

  return {
    ...originalModule,
    DataTable: (props) => mockDataTable(props),
  }
})

const makeRecord = (id: string, status = 'mining'): MinerRecord =>
  ({
    id,
    code: `M-${id}`,
    status,
    lastSyncedAt: new Date(0),
    tags: [],
    raw: {},
  }) as unknown as MinerRecord

const getFormattedDate = vi.fn(() => '2024-01-01 00:00')

const defaultProps: MinerExplorerTableProps = {
  data: [makeRecord('1'), makeRecord('2')],
  loading: false,
  selections: {},
  onSelectionsChange: vi.fn(),
  getFormattedDate,
}

const renderTable = (props: Partial<MinerExplorerTableProps> = {}) =>
  render(<MinerExplorerTable {...defaultProps} {...props} />)

describe('MinerExplorerTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders DataTable', () => {
      const { getByTestId } = renderTable()
      expect(getByTestId('data-table')).toBeInTheDocument()
    })

    it('passes wrapperClassName to DataTable', () => {
      const { getByTestId } = renderTable()
      expect(getByTestId('data-table')).toHaveClass('mdk-pm-miner-explorer__table')
    })
  })

  describe('data', () => {
    it('passes data to DataTable', () => {
      renderTable()
      expect(mockDataTable).toHaveBeenCalledWith(
        expect.objectContaining({ data: defaultProps.data }),
      )
    })

    it('passes empty array when data is empty', () => {
      renderTable({ data: [] })
      expect(mockDataTable).toHaveBeenCalledWith(expect.objectContaining({ data: [] }))
    })

    it('reflects row count in rendered output', () => {
      const { getByTestId } = renderTable()
      expect(getByTestId('data-table')).toHaveAttribute('data-row-count', '2')
    })
  })

  describe('loading', () => {
    it('passes loading=true to DataTable', () => {
      const { getByTestId } = renderTable({ loading: true })
      expect(getByTestId('data-table')).toHaveAttribute('data-loading', 'true')
    })

    it('passes loading=undefined when not provided', () => {
      renderTable({ loading: undefined })
      expect(mockDataTable).toHaveBeenCalledWith(expect.objectContaining({ loading: undefined }))
    })
  })

  describe('selections', () => {
    it('passes selections to DataTable', () => {
      const selections = { '1': true, '2': false }
      renderTable({ selections })
      expect(mockDataTable).toHaveBeenCalledWith(expect.objectContaining({ selections }))
    })

    it('passes empty selections object', () => {
      renderTable({ selections: {} })
      expect(mockDataTable).toHaveBeenCalledWith(expect.objectContaining({ selections: {} }))
    })

    it('passes onSelectionsChange to DataTable', () => {
      const onSelectionsChange = vi.fn()
      renderTable({ onSelectionsChange })
      expect(mockDataTable).toHaveBeenCalledWith(expect.objectContaining({ onSelectionsChange }))
    })
  })

  describe('columns', () => {
    it('calls getMinerTableColumns exactly once per render', () => {
      renderTable()
      expect(mockGetMinerTableColumns).toHaveBeenCalledTimes(1)
    })

    it('passes columns returned by getMinerTableColumns to DataTable', () => {
      renderTable()
      expect(mockDataTable).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: [
            { accessorKey: 'code', header: 'Miner Code' },
            { accessorKey: 'status', header: 'Status' },
          ],
        }),
      )
    })
  })

  describe('row selection', () => {
    it('passes enableRowSelection as a function', () => {
      renderTable()
      const { enableRowSelection } = mockDataTable.mock.calls[0][0]
      expect(typeof enableRowSelection).toBe('function')
    })

    it('allows selection for non-offline miners', () => {
      renderTable()
      const { enableRowSelection } = mockDataTable.mock.calls[0][0]
      expect(enableRowSelection({ original: makeRecord('1', MinerStatuses.MINING) })).toBe(true)
      expect(enableRowSelection({ original: makeRecord('2', MinerStatuses.SLEEPING) })).toBe(true)
    })

    it('disables selection for offline miners', () => {
      renderTable()
      const { enableRowSelection } = mockDataTable.mock.calls[0][0]
      expect(enableRowSelection({ original: makeRecord('3', MinerStatuses.OFFLINE) })).toBe(false)
    })
  })

  describe('static DataTable props', () => {
    it('passes getRowId that returns record.id', () => {
      renderTable()
      const { getRowId } = mockDataTable.mock.calls[0][0]
      expect(getRowId(makeRecord('abc'))).toBe('abc')
    })
  })
})
