/**
 * Runnable example for MultiSelect.
 */
import { MultiSelect, type MultiSelectOption } from '@tetherto/mdk-react-devkit/core'
import { useState } from 'react'

const MINER_TYPES: MultiSelectOption[] = [
  { value: 'miner-am-s19xp', label: 'Antminer S19XP' },
  { value: 'miner-wm-m56s', label: 'WhatsMiner M56S' },
  { value: 'miner-av-a1346', label: 'Avalon A1346' },
  { value: 'miner-acme-m1', label: 'Acme M1' },
]

export const MultiSelectExample = () => {
  const [selected, setSelected] = useState<string[]>([])

  return (
    <MultiSelect
      options={MINER_TYPES}
      value={selected}
      onValueChange={setSelected}
      placeholder="Filter by miner type"
      maxSelectedDisplay={2}
    />
  )
}
