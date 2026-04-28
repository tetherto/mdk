import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  MINER_IN_POOL_STATUS_COLORS,
  MINER_IN_POOL_STATUSES,
  MINER_STATUS_TO_IN_POOL_STATUS,
} from '../../pool-manager-constants'
import { minersTableColumns } from '../assign-pool-modal-columns'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    Indicator: ({
      color,
      size,
      children,
    }: {
      color: string
      size: string
      children: React.ReactNode
    }) => (
      <span data-testid="indicator" data-color={color} data-size={size}>
        {children}
      </span>
    ),
  }
})

const makeRow = (original: Partial<{ code: string; unit: string; pool: string; status: string }>) =>
  ({ original }) as any

const getColumn = (accessorKey: string) =>
  minersTableColumns.find((col) => col.accessorKey === accessorKey)!

const makeCellInfo = (value: unknown) => ({ getValue: () => value }) as any

describe('minersTableColumns', () => {
  describe('column definitions', () => {
    it('has 4 columns', () => {
      expect(minersTableColumns).toHaveLength(4)
    })

    it('has Miner Code column', () => {
      expect(getColumn('code').header).toBe('Miner Code')
    })

    it('has Unit column', () => {
      expect(getColumn('unit').header).toBe('Unit')
    })

    it('has Current Pool column', () => {
      expect(getColumn('pool').header).toBe('Current Pool')
    })

    it('has Status column', () => {
      expect(getColumn('status').header).toBe('Status')
    })
  })

  describe('sortingFn — code', () => {
    const { sortingFn } = getColumn('code')

    it('sorts ascending by code', () => {
      expect(sortingFn!(makeRow({ code: 'A' }), makeRow({ code: 'B' }), 'code')).toBeLessThan(0)
    })

    it('sorts descending by code', () => {
      expect(sortingFn!(makeRow({ code: 'B' }), makeRow({ code: 'A' }), 'code')).toBeGreaterThan(0)
    })

    it('returns 0 for equal codes', () => {
      expect(sortingFn!(makeRow({ code: 'A' }), makeRow({ code: 'A' }), 'code')).toBe(0)
    })

    it('treats undefined code as empty string', () => {
      expect(sortingFn!(makeRow({ code: undefined }), makeRow({ code: 'A' }), 'code')).toBeLessThan(
        0,
      )
    })
  })

  describe('sortingFn — unit', () => {
    const { sortingFn } = getColumn('unit')

    it('sorts ascending by unit', () => {
      expect(sortingFn!(makeRow({ unit: 'A' }), makeRow({ unit: 'B' }), 'unit')).toBeLessThan(0)
    })

    it('sorts descending by unit', () => {
      expect(sortingFn!(makeRow({ unit: 'B' }), makeRow({ unit: 'A' }), 'unit')).toBeGreaterThan(0)
    })

    it('returns 0 for equal units', () => {
      expect(sortingFn!(makeRow({ unit: 'X' }), makeRow({ unit: 'X' }), 'unit')).toBe(0)
    })

    it('treats undefined unit as empty string', () => {
      expect(sortingFn!(makeRow({ unit: undefined }), makeRow({ unit: 'A' }), 'unit')).toBeLessThan(
        0,
      )
    })
  })

  describe('sortingFn — pool', () => {
    const { sortingFn } = getColumn('pool')

    it('sorts ascending by pool', () => {
      expect(sortingFn!(makeRow({ pool: 'A' }), makeRow({ pool: 'B' }), 'pool')).toBeLessThan(0)
    })

    it('sorts descending by pool', () => {
      expect(sortingFn!(makeRow({ pool: 'B' }), makeRow({ pool: 'A' }), 'pool')).toBeGreaterThan(0)
    })

    it('returns 0 for equal pools', () => {
      expect(sortingFn!(makeRow({ pool: 'P' }), makeRow({ pool: 'P' }), 'pool')).toBe(0)
    })

    it('treats undefined pool as empty string', () => {
      expect(sortingFn!(makeRow({ pool: undefined }), makeRow({ pool: 'A' }), 'pool')).toBeLessThan(
        0,
      )
    })
  })

  describe('sortingFn — status', () => {
    const { sortingFn } = getColumn('status')

    it('sorts ascending by status', () => {
      expect(
        sortingFn!(makeRow({ status: 'active' }), makeRow({ status: 'inactive' }), 'status'),
      ).toBeLessThan(0)
    })

    it('sorts descending by status', () => {
      expect(
        sortingFn!(makeRow({ status: 'inactive' }), makeRow({ status: 'active' }), 'status'),
      ).toBeGreaterThan(0)
    })

    it('returns 0 for equal statuses', () => {
      expect(
        sortingFn!(makeRow({ status: 'active' }), makeRow({ status: 'active' }), 'status'),
      ).toBe(0)
    })

    it('treats undefined status as empty string', () => {
      expect(
        sortingFn!(makeRow({ status: undefined }), makeRow({ status: 'active' }), 'status'),
      ).toBeLessThan(0)
    })
  })

  describe('cell renderer — status', () => {
    const { cell } = getColumn('status')

    it('renders Indicator for a known active status', () => {
      const knownStatus = Object.keys(MINER_STATUS_TO_IN_POOL_STATUS)[0]
      render(<>{cell!(makeCellInfo(knownStatus))}</>)
      expect(screen.getByTestId('indicator')).toBeInTheDocument()
    })

    it('renders inPoolStatus text inside Indicator', () => {
      const knownStatus = Object.keys(
        MINER_STATUS_TO_IN_POOL_STATUS,
      )[0] as keyof typeof MINER_STATUS_TO_IN_POOL_STATUS
      const expectedInPoolStatus = MINER_STATUS_TO_IN_POOL_STATUS[knownStatus]
      render(<>{cell!(makeCellInfo(knownStatus))}</>)
      expect(screen.getByTestId('indicator')).toHaveTextContent(expectedInPoolStatus)
    })

    it('passes correct color to Indicator', () => {
      const knownStatus = Object.keys(
        MINER_STATUS_TO_IN_POOL_STATUS,
      )[0] as keyof typeof MINER_STATUS_TO_IN_POOL_STATUS
      const expectedInPoolStatus = MINER_STATUS_TO_IN_POOL_STATUS[knownStatus]
      const expectedColor = MINER_IN_POOL_STATUS_COLORS[expectedInPoolStatus]
      render(<>{cell!(makeCellInfo(knownStatus))}</>)
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', expectedColor)
    })

    it('passes size "sm" to Indicator', () => {
      const knownStatus = Object.keys(MINER_STATUS_TO_IN_POOL_STATUS)[0]
      render(<>{cell!(makeCellInfo(knownStatus))}</>)
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-size', 'sm')
    })

    it('falls back to INACTIVE status for unknown status string', () => {
      render(<>{cell!(makeCellInfo('unknown-status'))}</>)
      expect(screen.getByTestId('indicator')).toHaveTextContent(MINER_IN_POOL_STATUSES.INACTIVE)
    })

    it('falls back to INACTIVE status for undefined value', () => {
      const inactiveColor = MINER_IN_POOL_STATUS_COLORS[MINER_IN_POOL_STATUSES.INACTIVE]
      if (!inactiveColor) return
      render(<>{cell!(makeCellInfo(undefined))}</>)
      expect(screen.getByTestId('indicator')).toHaveTextContent(MINER_IN_POOL_STATUSES.INACTIVE)
    })
  })
})
