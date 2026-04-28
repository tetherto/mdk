import { Button, DropdownMenu } from '@tetherto/core'
import { useState } from 'react'

type MinerSetupFrequencyDropdownProps = {
  disabled: boolean
  buttonText: string
  onFrequencyToggle: (frequency: string) => void
  selectedFrequency: (string | number)[]
}

const FREQUENCY_COUNT = 10

export const MinerSetupFrequencyDropdown = ({
  disabled,
  buttonText = '',
  onFrequencyToggle,
  selectedFrequency = [],
}: Partial<MinerSetupFrequencyDropdownProps>) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedKeys = selectedFrequency.map(String)

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <Button variant="secondary">{buttonText}</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" side="top">
        <DropdownMenu.Label>{buttonText}</DropdownMenu.Label>
        <DropdownMenu.Group>
          {Array.from({ length: FREQUENCY_COUNT }, (_, index) => {
            const key = String(index)
            return (
              <DropdownMenu.StaticCheckboxItem
                key={key}
                checked={selectedKeys.includes(key)}
                onClick={() => {
                  setIsOpen(false)
                  onFrequencyToggle?.(key)
                }}
              >
                {`Frequency: ${index}`}
              </DropdownMenu.StaticCheckboxItem>
            )
          })}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
