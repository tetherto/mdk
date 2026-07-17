import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RepairLogChangesSubRow } from '../repair-log-changes-sub-row'
import { sparePartChangesColumns } from '../repair-log-changes-sub-row-columns'
import type { RepairBatchAction, RepairDevice } from '../types'

vi.mock('@domain/constants/device-constants', () => ({
  MINER_TYPE_NAME_MAP: { 'miner-rack': 'Antminer S21' },
}))

vi.mock('@domain/constants/spare-parts-constants', () => ({
  SparePartNames: { 'spare-rack': 'Hashboard' },
}))

vi.mock('@domain/utils/device-utils', () => ({
  // Identity makes `rack`/`rackId` map directly to the lookup keys above.
  getRackNameFromId: (id: string) => id,
  isMiner: (rack: string) => rack.startsWith('miner'),
}))

vi.mock('@primitives/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives/index')>()
  return {
    ...actual,
    Spinner: () => <div data-testid="spinner" />,
    DataTable: ({ data }: { data: Array<Record<string, unknown>> }) => (
      <div data-testid="table" data-row-count={data.length}>
        {data.map((row, index) => (
          <div
            key={index}
            data-testid="row"
            data-type={String(row.type)}
            data-serial={String(row.serialNum ?? '')}
            data-mac={String(row.macAddress ?? '')}
            data-removed={String(row.removed)}
          />
        ))}
      </div>
    ),
  }
})

const batchAction: RepairBatchAction = {
  params: [
    // Removed: no comment, non-miner rack, parentDeviceId is null → removed
    { params: [{ id: 'removed-part', rackId: 'spare-rack', info: { parentDeviceId: null } }] },
    // Added: non-miner rack, parentDeviceId present → not removed
    { params: [{ id: 'added-part', rackId: 'spare-rack', info: { parentDeviceId: 'host-1' } }] },
    // Excluded: has a comment
    { params: [{ id: 'commented-part', comment: 'note', info: { parentDeviceId: null } }] },
    // Excluded: rack is a miner
    { params: [{ id: 'miner-part', rackId: 'miner-rack', info: { parentDeviceId: null } }] },
  ],
}

const devices: RepairDevice[] = [
  { id: 'removed-part', rack: 'spare-rack', info: { serialNum: 'SN-1', macAddress: 'MAC-1' } },
  { id: 'added-part', rack: 'miner-rack', info: { serialNum: 'SN-2', macAddress: 'MAC-2' } },
  { id: 'commented-part', rack: 'unknown-rack' },
]

const renderComponent = (props: Partial<Parameters<typeof RepairLogChangesSubRow>[0]> = {}) =>
  render(<RepairLogChangesSubRow batchAction={batchAction} devices={devices} {...props} />)

describe('RepairLogChangesSubRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('renders the spinner when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
      expect(screen.queryByTestId('table')).not.toBeInTheDocument()
    })

    it('renders the table when isLoading is false (default)', () => {
      renderComponent()
      expect(screen.getByTestId('table')).toBeInTheDocument()
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    })
  })

  describe('row mapping', () => {
    it('renders one row per device', () => {
      renderComponent()
      expect(screen.getByTestId('table')).toHaveAttribute('data-row-count', '3')
    })

    it('resolves type from MINER_TYPE_NAME_MAP, then SparePartNames, then Unknown', () => {
      renderComponent()
      const rows = screen.getAllByTestId('row')
      expect(rows[0]).toHaveAttribute('data-type', 'Hashboard') // spare-rack → SparePartNames
      expect(rows[1]).toHaveAttribute('data-type', 'Antminer S21') // miner-rack → MINER_TYPE_NAME_MAP
      expect(rows[2]).toHaveAttribute('data-type', 'Unknown') // unknown-rack → fallback
    })

    it('maps serial number and MAC address from device info', () => {
      renderComponent()
      const rows = screen.getAllByTestId('row')
      expect(rows[0]).toHaveAttribute('data-serial', 'SN-1')
      expect(rows[0]).toHaveAttribute('data-mac', 'MAC-1')
    })

    it('leaves serial/MAC empty when device info is missing', () => {
      renderComponent()
      const rows = screen.getAllByTestId('row')
      expect(rows[2]).toHaveAttribute('data-serial', '')
      expect(rows[2]).toHaveAttribute('data-mac', '')
    })
  })

  describe('removed mapping', () => {
    it('flags a part as removed when its action has no parentDeviceId', () => {
      renderComponent()
      expect(screen.getAllByTestId('row')[0]).toHaveAttribute('data-removed', 'true')
    })

    it('flags a part as not removed when its action has a parentDeviceId', () => {
      renderComponent()
      expect(screen.getAllByTestId('row')[1]).toHaveAttribute('data-removed', 'false')
    })

    it('treats commented/miner actions as not removed (excluded from the mapping)', () => {
      renderComponent()
      // 'commented-part' was excluded by the comment filter → defaults to false
      expect(screen.getAllByTestId('row')[2]).toHaveAttribute('data-removed', 'false')
    })

    it('handles an empty batch action without throwing', () => {
      renderComponent({ batchAction: {} })
      const rows = screen.getAllByTestId('row')
      rows.forEach((row) => expect(row).toHaveAttribute('data-removed', 'false'))
    })

    it('handles devices without an id', () => {
      renderComponent({ devices: [{ rack: 'spare-rack' }] })
      expect(screen.getByTestId('table')).toHaveAttribute('data-row-count', '1')
      expect(screen.getByTestId('row')).toHaveAttribute('data-removed', 'false')
    })
  })
})

describe('sparePartChangesColumns', () => {
  const changesColumn = sparePartChangesColumns.find(
    (column) => 'accessorKey' in column && column.accessorKey === 'removed',
  )
  const renderCell = (value: boolean): ReactNode => {
    const cell = changesColumn?.cell as (info: { getValue: () => boolean }) => ReactNode
    return cell({ getValue: () => value })
  }

  it('renders a "Removed" label when removed is true', () => {
    const { container } = render(<>{renderCell(true)}</>)
    expect(screen.getByText('Removed')).toBeInTheDocument()
    expect(container.querySelector('.mdk-repair-log-changes__label--removed')).toBeInTheDocument()
  })

  it('renders an "Added" label when removed is false', () => {
    const { container } = render(<>{renderCell(false)}</>)
    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(container.querySelector('.mdk-repair-log-changes__label--added')).toBeInTheDocument()
  })
})
