import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tetherto/mdk-core-ui'
import * as React from 'react'
import { MINER_TYPE_NAME_MAP } from '../../../../../../constants/device-constants'
import { getRackNameFromId } from '../../../../../../utils/device-utils'

import './rack-id-selection-dropdown.scss'

const MOCK_RACKS = [
  { id: 'rack-001-123', type: 'miner-standard' },
  { id: 'rack-002-231', type: 'miner-pro' },
  { id: 'pool-001-001', type: 'minerpool-alpha' },
  { id: 'rack-003-333', type: 'miner-immersion' },
]

export type RackIdSelectionDropdownProps = {
  value: string | null
  handleChange: (value: string) => void
  placeholder: string | null
  status: 'error' | 'warning'
}

export const RackIdSelectionDropdown = ({
  value = '',
  handleChange,
  placeholder = 'Select a rack...',
  status,
}: Partial<RackIdSelectionDropdownProps>) => {
  const [isLoading] = React.useState(false)

  const selectOptions = React.useMemo(() => {
    return MOCK_RACKS.filter((rack) => !rack.type.startsWith('minerpool-')).map((rack) => {
      const rackName = getRackNameFromId(rack.id)
      const label = (MINER_TYPE_NAME_MAP as Record<string, string>)[rackName] ?? rackName

      return {
        value: rack.id,
        label,
      }
    })
  }, [])

  return (
    <Select value={value || undefined} onValueChange={handleChange} disabled={isLoading}>
      <SelectTrigger
        className={cn('mdk-rack-select__trigger', status && `mdk-rack-select--${status}`)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent className="mdk-rack-select__content">
        {selectOptions.length > 0 ? (
          selectOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        ) : (
          <div className="mdk-rack-select__empty">No racks found</div>
        )}
      </SelectContent>
    </Select>
  )
}
