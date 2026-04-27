import { useState } from 'react'

import { ArrowIcon, cn, DropdownMenu, SimpleTooltip } from '@mdk/core'

import { getSupportedPowerModes } from '../../../../../utils/device-utils'
import { getDefaultSelectedPowerModes } from '../miner-controls-card/miner-controls-utils'
import './power-mode-selection-dropdown.scss'

type PowerModeSelectionDropdownProps = {
  model: string
  currentPowerModes: Record<string, number>
  onPowerModeToggle: (mode: string) => void
  buttonText: string
  disabled: boolean
}

export const PowerModeSelectionDropdown = ({
  model = '',
  currentPowerModes = {},
  onPowerModeToggle,
  buttonText = '',
  disabled = false,
}: Partial<PowerModeSelectionDropdownProps>) => {
  const [isOpen, setIsOpen] = useState(false)

  const selectedKeys: string[] = getDefaultSelectedPowerModes(currentPowerModes).filter(
    (key): key is string => typeof key === 'string',
  )

  const powerModeItems = getSupportedPowerModes(model).map((mode) => ({
    key: mode,
    label: `${mode} (${currentPowerModes[mode] ?? 0})`,
  }))

  const trigger = (
    <div
      className={cn(
        'mdk-power-mode-dropdown-button',
        disabled && 'mdk-power-mode-dropdown-button--disabled',
        isOpen && 'mdk-power-mode-dropdown-button--open',
      )}
    >
      <div>{disabled ? 'Set Power Mode' : buttonText}</div>
      <ArrowIcon isOpen={!isOpen} />
    </div>
  )

  return (
    <DropdownMenu.Root onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        {disabled ? (
          <SimpleTooltip content="Cannot change power mode while container is stopped." side="top">
            <span>{trigger}</span>
          </SimpleTooltip>
        ) : (
          <span>{trigger}</span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" alignWidth side="top">
        {powerModeItems.map(({ key, label }) => (
          <DropdownMenu.Item
            key={key}
            onClick={() => onPowerModeToggle?.(key)}
            defaultChecked={selectedKeys.includes(key)}
          >
            {label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
