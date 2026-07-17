import type { DataTableColumnDef } from '@primitives'
import { FALLBACK, SimpleTooltip } from '@primitives'

import { SEVERITY_COLORS, SEVERITY_LEVELS } from '../../constants/alerts'

import type { AlertTableRecord } from './alerts-types'

import './alerts-table-columns.scss'

const CELL_MIN_WIDTH = 160

export type GetAlertsTableColumnsOptions = {
  getFormattedDate: (date: Date) => string
}

export const getAlertsTableColumns = ({
  getFormattedDate,
}: GetAlertsTableColumnsOptions): DataTableColumnDef<AlertTableRecord>[] => [
  {
    header: 'Code',
    accessorKey: 'shortCode',
    minSize: 180,
    cell: (info) => {
      const code = (info.getValue() as string) ?? FALLBACK
      const { matchedOn } = info.row.original
      if (!matchedOn?.length) return code

      return (
        <SimpleTooltip content={`Matched on ${matchedOn.join(', ')}`}>
          <span className="mdk-alerts-code-cell--matched">{code}</span>
        </SimpleTooltip>
      )
    },
    sortingFn: (a, b) => (a.original.shortCode ?? '').localeCompare(b.original.shortCode ?? ''),
  },
  {
    header: 'Position',
    accessorKey: 'device',
    minSize: 180,
    cell: (info) => (info.getValue() as string) ?? FALLBACK,
    sortingFn: (a, b) => (a.original.device ?? '').localeCompare(b.original.device ?? ''),
  },
  {
    header: 'Alert name',
    accessorKey: 'alertName',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => (info.getValue() as string) ?? FALLBACK,
    sortingFn: (a, b) => (a.original.alertName ?? '').localeCompare(b.original.alertName ?? ''),
  },
  {
    header: 'Description',
    accessorKey: 'description',
    minSize: 450,
    cell: (info) => {
      const description = info.getValue() as string | undefined
      const { message } = info.row.original

      return (
        <>
          <span>{description || ''}</span>
          {message ? `: ${message}` : ''}
        </>
      )
    },
    sortingFn: (a, b) => (a.original.description ?? '').localeCompare(b.original.description ?? ''),
  },
  {
    header: 'Severity',
    accessorKey: 'severity',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const severity = info.getValue() as string

      return (
        <span
          style={{
            color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || severity,
          }}
        >
          {severity}
        </span>
      )
    },
    sortingFn: (a, b) =>
      (SEVERITY_LEVELS[a.original.severity as keyof typeof SEVERITY_LEVELS] ?? 0) -
      (SEVERITY_LEVELS[b.original.severity as keyof typeof SEVERITY_LEVELS] ?? 0),
  },
  {
    header: 'Created at',
    accessorKey: 'createdAt',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const value = info.getValue() as number | string
      return value ? getFormattedDate(new Date(value)) : FALLBACK
    },
    sortingFn: (a, b) =>
      new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
  },
  // NOTE: The "Actions" column (right-arrow → open alert) is intentionally
  // omitted. In the source app it navigates to the mining explorer, which
  // does not exist in this shell yet, so the button had no meaningful
  // destination. The `actions` / `onAlertClick` plumbing is kept on the
  // records so the column can be reinstated once an explorer/detail view
  // lands. See AlertActions in alerts-types.ts.
]
