/* eslint-disable ts/no-unsafe-function-type */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UNITS } from '@tetherto/mdk-core-ui'
import type { MinerRecord } from '../../types'
import { getMinerTableColumns } from '../miner-explorer-columns'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...original,
    Indicator: ({ color, children }: { color: string; children: React.ReactNode }) => (
      <span data-testid="indicator" data-color={color}>
        {children}
      </span>
    ),
  }
})

vi.mock('../../../../utils/device-utils', () => ({
  getHashrateString: vi.fn((v: number) => `${v} TH/s`),
}))

vi.mock('../pool-manager-constants', () => ({
  MINER_IN_POOL_STATUSES: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    INACTIVE: 'inactive',
  },
  MINER_IN_POOL_STATUS_COLORS: {
    online: 'green',
    offline: 'red',
    inactive: 'gray',
  },
  MINER_STATUS_TO_IN_POOL_STATUS: {
    mining: 'online',
    offline: 'offline',
    sleeping: 'inactive',
    error: 'offline',
    maintenance: 'inactive',
    alert: 'offline',
  },
}))

vi.mock('../../../../constants/dates', () => ({
  DATE_TIME_FORMAT: 'yyyy-MM-dd HH:mm',
}))

const getFormattedDate = vi.fn((date: Date | number) => `formatted:${new Date(date).toISOString()}`)

const makeRecord = (overrides: Partial<MinerRecord> = {}): MinerRecord =>
  ({
    id: 'r1',
    code: 'M001',
    unit: 'unit-01',
    pool: 'Primary Pool',
    status: 'mining',
    hashrate: 100,
    lastSyncedAt: new Date('2024-01-15T10:00:00Z'),
    tags: [],
    raw: {},
    ...overrides,
  }) as unknown as MinerRecord

const makeCellInfo = (value: unknown, record: MinerRecord) => ({
  getValue: () => value,
  row: { original: record },
})

const makeRow = (record: MinerRecord) => ({ original: record })

describe('getMinerTableColumns', () => {
  const columns = getMinerTableColumns(getFormattedDate)

  describe('structure', () => {
    it('returns an array of 6 columns', () => {
      expect(columns).toHaveLength(6)
    })

    it('every column has a header', () => {
      columns.forEach((col) => expect(col.header).toBeDefined())
    })

    it('every column has a cell function', () => {
      columns.forEach((col) => expect(typeof col.cell).toBe('function'))
    })

    it('every column has a sortingFn', () => {
      columns.forEach((col) => expect(typeof col.sortingFn).toBe('function'))
    })

    it('every column has minSize of 100', () => {
      columns.forEach((col) => expect(col.minSize).toBe(100))
    })

    it('has correct headers in order', () => {
      expect(columns.map((c) => c.header)).toEqual([
        'Miner Code',
        'Unit',
        'Current Pool',
        'Status',
        'Hashrate',
        'Last Sync',
      ])
    })
  })

  describe('Miner Code column', () => {
    const col = getMinerTableColumns(getFormattedDate)[0]!
    const cellFn = col.cell as Function
    const sortFn = col.sortingFn as Function

    it('cell renders the code value', () => {
      const result = cellFn(makeCellInfo('M001', makeRecord()))
      expect(result).toBe('M001')
    })

    it('cell renders undefined when code is undefined', () => {
      const result = cellFn(makeCellInfo(undefined, makeRecord()))
      expect(result).toBeUndefined()
    })

    it('sortingFn sorts ascending by code', () => {
      expect(
        sortFn(makeRow(makeRecord({ code: 'A' })), makeRow(makeRecord({ code: 'B' }))),
      ).toBeLessThan(0)
    })

    it('sortingFn sorts descending by code', () => {
      expect(
        sortFn(makeRow(makeRecord({ code: 'B' })), makeRow(makeRecord({ code: 'A' }))),
      ).toBeGreaterThan(0)
    })

    it('sortingFn returns 0 for equal codes', () => {
      expect(sortFn(makeRow(makeRecord({ code: 'A' })), makeRow(makeRecord({ code: 'A' })))).toBe(0)
    })

    it('sortingFn treats undefined code as empty string', () => {
      expect(
        sortFn(makeRow(makeRecord({ code: undefined })), makeRow(makeRecord({ code: 'A' }))),
      ).toBeLessThan(0)
    })
  })

  describe('Unit column', () => {
    const col = getMinerTableColumns(getFormattedDate)[1]!
    const cellFn = col.cell as Function
    const sortFn = col.sortingFn as Function

    it('cell renders the unit value', () => {
      expect(cellFn(makeCellInfo('unit-01', makeRecord()))).toBe('unit-01')
    })

    it('cell renders - when value is undefined', () => {
      expect(cellFn(makeCellInfo(undefined, makeRecord()))).toBe('-')
    })

    it('sortingFn sorts ascending by unit', () => {
      expect(
        sortFn(makeRow(makeRecord({ unit: 'A' })), makeRow(makeRecord({ unit: 'B' }))),
      ).toBeLessThan(0)
    })

    it('sortingFn treats undefined unit as empty string', () => {
      expect(
        sortFn(makeRow(makeRecord({ unit: undefined })), makeRow(makeRecord({ unit: 'A' }))),
      ).toBeLessThan(0)
    })
  })

  describe('Current Pool column', () => {
    const col = getMinerTableColumns(getFormattedDate)[2]!
    const cellFn = col.cell as Function
    const sortFn = col.sortingFn as Function

    it('cell renders the pool value', () => {
      expect(cellFn(makeCellInfo('Primary Pool', makeRecord()))).toBe('Primary Pool')
    })

    it('cell renders - when value is undefined', () => {
      expect(cellFn(makeCellInfo(undefined, makeRecord()))).toBe('-')
    })

    it('sortingFn sorts ascending by pool', () => {
      expect(
        sortFn(makeRow(makeRecord({ pool: 'A' })), makeRow(makeRecord({ pool: 'B' }))),
      ).toBeLessThan(0)
    })

    it('sortingFn treats undefined pool as empty string', () => {
      expect(
        sortFn(makeRow(makeRecord({ pool: undefined })), makeRow(makeRecord({ pool: 'A' }))),
      ).toBeLessThan(0)
    })
  })

  describe('Status column', () => {
    const col = getMinerTableColumns(getFormattedDate)[3]!
    const cellFn = col.cell as Function
    const sortFn = col.sortingFn as Function

    const renderCell = (status: string | undefined) => {
      const { container } = render(<>{cellFn(makeCellInfo(status, makeRecord({ status })))}</>)
      return container
    }

    it('renders Indicator for mining status', () => {
      renderCell('mining')
      expect(screen.getByTestId('indicator')).toBeInTheDocument()
    })

    it('Indicator has correct color for mining (online → green)', () => {
      renderCell('mining')
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'green')
    })

    it('Indicator has correct color for offline (offline → red)', () => {
      renderCell('offline')
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'red')
    })

    it('Indicator has correct color for sleeping (inactive → gray)', () => {
      renderCell('sleeping')
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'gray')
    })

    it('Indicator displays the inPoolStatus label', () => {
      renderCell('mining')
      expect(screen.getByTestId('indicator')).toHaveTextContent('online')
    })

    it('sortingFn sorts ascending by status', () => {
      expect(
        sortFn(
          makeRow(makeRecord({ status: 'mining' })),
          makeRow(makeRecord({ status: 'offline' })),
        ),
      ).toBeLessThan(0)
    })

    it('sortingFn treats undefined status as empty string', () => {
      expect(
        sortFn(
          makeRow(makeRecord({ status: undefined })),
          makeRow(makeRecord({ status: 'mining' })),
        ),
      ).toBeLessThan(0)
    })
  })

  describe('Hashrate column', () => {
    const col = getMinerTableColumns(getFormattedDate)[4]!
    const cellFn = col.cell as Function
    const sortFn = col.sortingFn as Function

    it('cell calls getHashrateString when value is present', () => {
      const result = cellFn(makeCellInfo(100, makeRecord({ hashrate: 100 })))
      expect(result).toBe(`100 ${UNITS.HASHRATE_MH_S}`)
    })

    it('cell renders - when value is undefined', () => {
      expect(cellFn(makeCellInfo(undefined, makeRecord()))).toBe('-')
    })

    it('cell renders - when value is 0', () => {
      expect(cellFn(makeCellInfo(0, makeRecord()))).toBe('-')
    })

    it('sortingFn sorts ascending by hashrate', () => {
      expect(
        sortFn(makeRow(makeRecord({ hashrate: 50 })), makeRow(makeRecord({ hashrate: 100 }))),
      ).toBeLessThan(0)
    })

    it('sortingFn sorts descending by hashrate', () => {
      expect(
        sortFn(makeRow(makeRecord({ hashrate: 100 })), makeRow(makeRecord({ hashrate: 50 }))),
      ).toBeGreaterThan(0)
    })

    it('sortingFn returns 0 for equal hashrates', () => {
      expect(
        sortFn(makeRow(makeRecord({ hashrate: 100 })), makeRow(makeRecord({ hashrate: 100 }))),
      ).toBe(0)
    })

    it('sortingFn treats undefined hashrate as 0', () => {
      expect(
        sortFn(makeRow(makeRecord({ hashrate: undefined })), makeRow(makeRecord({ hashrate: 10 }))),
      ).toBeLessThan(0)
    })
  })

  describe('Last Sync column', () => {
    const col = getMinerTableColumns(getFormattedDate)[5]!
    const cellFn = col.cell as Function
    const sortFn = col.sortingFn as Function

    const date = new Date('2024-01-15T10:00:00Z')

    it('cell calls getFormattedDate with the date value', () => {
      cellFn(makeCellInfo(date, makeRecord({ lastSyncedAt: date })))
      expect(getFormattedDate).toHaveBeenCalledWith(date, undefined, 'dd-MM-yyyy HH:mm')
    })

    it('cell renders the formatted date string', () => {
      const result = cellFn(makeCellInfo(date, makeRecord({ lastSyncedAt: date })))
      expect(result).toContain('formatted:')
    })

    it('cell renders - when value is undefined', () => {
      expect(cellFn(makeCellInfo(undefined, makeRecord()))).toBe('-')
    })

    it('sortingFn sorts ascending by lastSyncedAt', () => {
      const earlier = new Date('2024-01-01T00:00:00Z')
      const later = new Date('2024-06-01T00:00:00Z')
      expect(
        sortFn(
          makeRow(makeRecord({ lastSyncedAt: earlier })),
          makeRow(makeRecord({ lastSyncedAt: later })),
        ),
      ).toBeLessThan(0)
    })

    it('sortingFn sorts descending by lastSyncedAt', () => {
      const earlier = new Date('2024-01-01T00:00:00Z')
      const later = new Date('2024-06-01T00:00:00Z')
      expect(
        sortFn(
          makeRow(makeRecord({ lastSyncedAt: later })),
          makeRow(makeRecord({ lastSyncedAt: earlier })),
        ),
      ).toBeGreaterThan(0)
    })

    it('sortingFn returns 0 for equal dates', () => {
      expect(
        sortFn(
          makeRow(makeRecord({ lastSyncedAt: date })),
          makeRow(makeRecord({ lastSyncedAt: date })),
        ),
      ).toBe(0)
    })
  })
})
