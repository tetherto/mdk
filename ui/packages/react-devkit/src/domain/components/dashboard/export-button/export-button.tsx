import { Button, DropdownMenu } from '@primitives'
import { ChevronDownIcon, DownloadIcon } from '@radix-ui/react-icons'
import type { JSX } from 'react'
import './export-button.scss'

export type ExportFormat = 'csv' | 'json'

export type ExportButtonProps = {
  /** Fires with the chosen format when the user picks an item. */
  onExport: (format: ExportFormat) => void
  /** Formats to offer in the dropdown — defaults to `['csv', 'json']`. */
  formats?: readonly ExportFormat[]
  /** Button label — defaults to `'Export'`. */
  label?: string
  /** Disable the button. */
  disabled?: boolean
  /** Optional class hook on the wrapper. */
  className?: string
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'Export as CSV',
  json: 'Export as JSON',
}

/**
 * Split-button trigger for downloading the current dashboard state. The
 * left half labels the action (`↓ Export`); the right half opens a dropdown
 * with the available formats and invokes `onExport(format)` on selection.
 *
 * @category dashboard
 * @domain mining-operations
 * @tier agent-ready
 * @kernelCapability data-export
 *
 * @example
 * ```tsx
 * const { exportCsv, exportJson } = useDashboardExport()
 * <ExportButton
 *   onExport={(fmt) => (fmt === 'csv' ? exportCsv() : exportJson())}
 * />
 * ```
 */
export const ExportButton = ({
  onExport,
  formats = ['csv', 'json'],
  label = 'Export',
  disabled = false,
  className,
}: ExportButtonProps): JSX.Element => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="secondary"
          disabled={disabled}
          icon={<DownloadIcon />}
          className={['mdk-export-button', className].filter(Boolean).join(' ')}
        >
          <span className="mdk-export-button__label">{label}</span>
          <ChevronDownIcon className="mdk-export-button__chevron" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" size="sm" className="mdk-export-button__menu">
        {formats.map((format) => (
          <DropdownMenu.Item key={format} onSelect={() => onExport(format)}>
            {FORMAT_LABELS[format]}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

ExportButton.displayName = 'ExportButton'
