import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AlertTableRecord } from '../alerts-types'
import { getAlertsTableColumns } from '../alerts-table-columns'
import { FALLBACK } from '@core/index'

vi.mock('@core/index', async () => {
  const actual = await vi.importActual<typeof import('@core/index')>('@core/index')
  return {
    ...actual,
    SimpleTooltip: vi.fn(({ content, children }) => (
      <div data-testid="tooltip">
        <div data-testid="tooltip-content">{content}</div>
        {children}
      </div>
    )),
  }
})

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
    expect(columns).toHaveLength(6)
    expect(columns.map((c) => c.header)).toEqual([
      'Code',
      'Position',
      'Alert name',
      'Description',
      'Severity',
      'Created at',
    ])
  })

  it('does not include an actions column', () => {
    const columns = getAlertsTableColumns({ getFormattedDate: formatDate })
    expect(columns.find((c) => c.id === 'actions')).toBeUndefined()
  })

  it('renders shortCode column with fallback when value is missing', () => {
    renderCell('shortCode', buildRecord({ shortCode: undefined as unknown as string }))
    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
  })

  it('surfaces the matched-on hint as a tooltip on the code when present', () => {
    renderCell('shortCode', buildRecord({ matchedOn: ['sn-SN333', 'ip-10.0.33.1'] }))
    const code = screen.getByText('M-001')
    expect(code).toHaveClass('mdk-alerts-code-cell--matched')
    expect(screen.getByTestId('tooltip-content')).toHaveTextContent(
      'Matched on sn-SN333, ip-10.0.33.1',
    )
  })

  it('renders the bare code without a tooltip when matchedOn is absent', () => {
    renderCell('shortCode', buildRecord())
    expect(screen.getByText('M-001')).toBeInTheDocument()
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
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
