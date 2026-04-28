import { ArrowIcon, cn, DropdownMenu, ExportIcon, Spinner } from '@tetherto/core'
import type { ComponentSize, SpinnerProps } from '@tetherto/core'
import { useState } from 'react'
import { EXPORT_ITEM_KEYS, EXPORT_ITEMS, EXPORT_LABEL } from './constants'

type StatsExportProps = {
  showLabel?: boolean
  disabled?: boolean
  onCsvExport: () => Promise<void>
  onJsonExport: () => Promise<void>
}

type ExportHandlerType = (typeof EXPORT_ITEM_KEYS)[keyof typeof EXPORT_ITEM_KEYS]

const SPINNER_SIZE: ComponentSize = 'sm'
const SPINNER_COLOR: SpinnerProps['color'] = 'secondary'

export const StatsExport = ({
  onJsonExport,
  onCsvExport,
  disabled = false,
  showLabel = false,
}: StatsExportProps): React.ReactElement => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isButtonDisabled = isLoading || disabled

  const exportHandlers: Record<ExportHandlerType, () => Promise<void>> = {
    [EXPORT_ITEM_KEYS.CSV]: onCsvExport,
    [EXPORT_ITEM_KEYS.JSON]: onJsonExport,
  }

  const handleMenuClick = async (key: ExportHandlerType): Promise<void> => {
    setOpen(false)
    setIsLoading(true)

    await exportHandlers[key]?.()

    setIsLoading(false)
  }

  const handleOpenChange = (isOpened: boolean): void => {
    if (!isButtonDisabled) {
      setOpen(isOpened)
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild disabled={isButtonDisabled}>
        <button
          className={cn('stats-export__button', {
            'stats-export__button--disabled': isButtonDisabled,
          })}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <Spinner type="circle" size={SPINNER_SIZE} color={SPINNER_COLOR} />
          ) : (
            <ExportIcon />
          )}
          {!showLabel && <span className="stats-export__label">{EXPORT_LABEL}</span>}
          <span className="stats-export__divider" />
          <ArrowIcon isOpen={open} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="start" className="stats-export__dropdown">
        {EXPORT_ITEMS.map((item, index) => (
          <DropdownMenu.Item
            key={item.key}
            className={cn(
              'stats-export__item',
              index !== EXPORT_ITEMS.length - 1 && 'stats-export__item--bordered',
            )}
            onSelect={() => handleMenuClick(item.key)}
          >
            {item.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
