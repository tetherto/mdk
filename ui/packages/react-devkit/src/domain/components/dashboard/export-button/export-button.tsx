import { Button, DropdownMenu } from '@primitives'
import { ChevronDownIcon, DownloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import type { JSX } from 'react'
import './export-button.scss'

export type ExportFormat = 'csv' | 'json'

export type ExportButtonProps = {
  /**
   * Fires with the chosen format when the user picks an item. Return a promise
   * to show a loading state until it settles; a rejection clears it and is not
   * rethrown, so report failures inside the handler.
   */
  onExport: (format: ExportFormat) => void | Promise<void>
  /**
   * Formats to offer in the dropdown — defaults to `['csv', 'json']`.
   * @default ['csv', 'json']
   */
  formats?: readonly ExportFormat[]
  /**
   * Button label — defaults to `'Export'`.
   * @default 'Export'
   */
  label?: string
  /**
   * Disable the button.
   * @default false
   */
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
 * When the handler returns a promise, the button shows a spinner and stays
 * disabled until it settles.
 *
 * @category dashboard
 * @domain mining-operations
 * @tier agent-ready
 * @kernelCapability data-export
 *
 * @example
 * ```tsx
 * import { downloadCsv, downloadJson } from '@tetherto/mdk-ui-foundation'
 *
 * <ExportButton
 *   onExport={(fmt) => (fmt === 'csv' ? downloadCsv(rows) : downloadJson(rows))}
 * />
 * // async: spinner until the export settles
 * <ExportButton onExport={(fmt) => api.exportStats(fmt)} />
 * ```
 */
export const ExportButton = ({
  onExport,
  formats = ['csv', 'json'],
  label = 'Export',
  disabled = false,
  className,
}: ExportButtonProps): JSX.Element => {
  const [exporting, setExporting] = useState(false)

  const handleSelect = async (format: ExportFormat): Promise<void> => {
    const pending = onExport(format)
    if (!pending) return
    setExporting(true)
    try {
      await pending
    } catch {
      // The handler runs from a menu event, so a rejection has no caller to
      // reach; reporting the failure is the handler's job.
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="secondary"
          disabled={disabled}
          loading={exporting}
          icon={<DownloadIcon />}
          className={['mdk-export-button', className].filter(Boolean).join(' ')}
        >
          <span className="mdk-export-button__label">{label}</span>
          <ChevronDownIcon className="mdk-export-button__chevron" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" size="sm" className="mdk-export-button__menu">
        {formats.map((format) => (
          <DropdownMenu.Item key={format} onSelect={() => void handleSelect(format)}>
            {FORMAT_LABELS[format]}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

ExportButton.displayName = 'ExportButton'
