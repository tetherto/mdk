import type { DataTableColumnDef } from '@mdk/core'
import { Button, FALLBACK } from '@mdk/core'
import { ChevronRightIcon } from '@radix-ui/react-icons'

import { SEVERITY_COLORS, SEVERITY_LEVELS } from '../../../constants/alerts'

import type { AlertTableRecord } from './alerts-types'

const CELL_MIN_WIDTH = 160

export type GetAlertsTableColumnsOptions = {
  isMobile?: boolean
  getFormattedDate: (date: Date) => string
}

export const getAlertsTableColumns = ({
  isMobile = false,
  getFormattedDate,
}: GetAlertsTableColumnsOptions): DataTableColumnDef<AlertTableRecord>[] => [
  {
    header: 'Code',
    accessorKey: 'shortCode',
    minSize: 180,
    cell: (info) => (info.getValue() as string) ?? FALLBACK,
    sortingFn: (a, b) => (a.original.shortCode ?? '').localeCompare(b.original.shortCode ?? ''),
  },
  {
    header: 'Position',
    accessorKey: 'device',
    minSize: 180,
    cell: (info) => (info.getValue() as string) ?? FALLBACK,
    sortingFn: (a, b) => (a.original.device ?? '').localeCompare(b.original.device ?? ''),
    meta: { fixed: isMobile ? undefined : 'left' },
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
  {
    id: 'actions',
    header: 'Actions',
    cell: (info) => {
      const actions = info.row.original.actions
      if (!actions) return null

      const { onAlertClick, id, uuid } = actions

      return (
        <Button
          variant="icon"
          aria-label="Open alert"
          icon={<ChevronRightIcon />}
          onClick={() => onAlertClick?.(id || '', uuid)}
        />
      )
    },
    enableSorting: false,
  },
]
