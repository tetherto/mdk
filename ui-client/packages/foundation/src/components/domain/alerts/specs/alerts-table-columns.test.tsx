import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AlertTableRecord } from '../alerts-types'
import { getAlertsTableColumns } from '../alerts-table-columns'
import { FALLBACK } from '@tetherto/core'

const formatDate = vi.fn((d: Date) => `formatted:${d.toISOString()}`)

const buildRecord = (overrides: Partial<AlertTableRecord> = {}): AlertTableRecord => ({
  shortCode: 'M-001',
  device: 'unit-01 1-1',
  alertName: 'Overheating',
  severity: 'critical',
  description: 'Sensor over threshold',
  message: 'over limit',
  createdAt: 1_700_000_000_000,
  uuid: 'alert-uuid-1',
  id: 'device-1',
  actions: { uuid: 'alert-uuid-1', id: 'device-1', onAlertClick: vi.fn() },
  ...overrides,
})

const renderCell = (
  columnId: string | number,
  record: AlertTableRecord,
): ReturnType<typeof render> => {
  const columns = getAlertsTableColumns({ getFormattedDate: formatDate })
  const column = columns.find(
    (c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) === columnId,
  )
  if (!column?.cell) throw new Error(`Column not found: ${columnId}`)

  const cell = (column.cell as unknown as (info: unknown) => React.ReactNode)({
    getValue: () => (record as Record<string, unknown>)[columnId as string],
    row: { original: record },
  })

  return render(<>{cell as React.ReactElement}</>)
}

describe('getAlertsTableColumns', () => {
  it('returns the expected list of columns', () => {
    const columns = getAlertsTableColumns({ getFormattedDate: formatDate })
    expect(columns).toHaveLength(7)
    expect(columns.map((c) => c.header)).toEqual([
      'Code',
      'Position',
      'Alert name',
      'Description',
      'Severity',
      'Created at',
      'Actions',
    ])
  })

  it('renders shortCode column with fallback when value is missing', () => {
    renderCell('shortCode', buildRecord({ shortCode: undefined as unknown as string }))
    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
  })

  it('renders alertName column value', () => {
    renderCell('alertName', buildRecord({ alertName: 'Pool down' }))
    expect(screen.getByText('Pool down')).toBeInTheDocument()
  })

  it('renders description with appended message', () => {
    const { container } = renderCell(
      'description',
      buildRecord({ description: 'Boom', message: 'extra' }),
    )
    expect(container.textContent).toContain('Boom: extra')
  })

  it('omits trailing colon when message is empty', () => {
    const { container } = renderCell(
      'description',
      buildRecord({ description: 'Just description', message: undefined }),
    )
    expect(container.textContent).toBe('Just description')
  })

  it('renders severity colored span', () => {
    renderCell('severity', buildRecord({ severity: 'critical' }))
    const span = screen.getByText('critical')
    expect(span).toBeInTheDocument()
    expect(span).toHaveAttribute('style')
  })

  it('renders formatted createdAt value', () => {
    renderCell('createdAt', buildRecord({ createdAt: 1_700_000_000_000 }))
    expect(screen.getByText(/^formatted:/)).toBeInTheDocument()
    expect(formatDate).toHaveBeenCalled()
  })

  it('renders fallback when createdAt is missing', () => {
    renderCell('createdAt', buildRecord({ createdAt: 0 }))
    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
  })

  it('actions column triggers onAlertClick when icon button is clicked', () => {
    const onAlertClick = vi.fn()
    renderCell(
      'actions',
      buildRecord({ actions: { uuid: 'alert-uuid-2', id: 'device-2', onAlertClick } }),
    )
    fireEvent.click(screen.getByRole('button', { name: /open alert/i }))
    expect(onAlertClick).toHaveBeenCalledWith('device-2', 'alert-uuid-2')
  })

  it('actions column renders nothing when actions are missing', () => {
    const columns = getAlertsTableColumns({ getFormattedDate: formatDate })
    const actions = columns.find((c) => c.id === 'actions')!
    const cell = (actions.cell as unknown as (info: unknown) => React.ReactNode)({
      getValue: () => undefined,
      row: { original: { ...buildRecord(), actions: undefined } },
    })
    const { container } = render(<>{cell as React.ReactElement}</>)
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes left-fixed meta on Position column when not on mobile', () => {
    const columns = getAlertsTableColumns({ getFormattedDate: formatDate, isMobile: false })
    const position = columns.find(
      (c) => (c as { accessorKey?: string }).accessorKey === 'device',
    ) as { meta?: { fixed?: string } }
    expect(position.meta?.fixed).toBe('left')
  })

  it('removes fixed meta on Position column when on mobile', () => {
    const columns = getAlertsTableColumns({ getFormattedDate: formatDate, isMobile: true })
    const position = columns.find(
      (c) => (c as { accessorKey?: string }).accessorKey === 'device',
    ) as { meta?: { fixed?: string } }
    expect(position.meta?.fixed).toBeUndefined()
  })

  it('severity sorting compares level rank', () => {
    const columns = getAlertsTableColumns({ getFormattedDate: formatDate })
    const severity = columns.find(
      (c) => (c as { accessorKey?: string }).accessorKey === 'severity',
    ) as { sortingFn: (a: unknown, b: unknown) => number }
    const a = { original: { severity: 'critical' } } as unknown
    const b = { original: { severity: 'medium' } } as unknown
    expect(severity.sortingFn(a, b)).toBeGreaterThan(0)
  })
})
