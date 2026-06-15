import { MultiSelect, type MultiSelectOption } from '@tetherto/mdk-react-devkit/core'
import { type JSX, useState } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const MINER_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: 'miner-am-s19xp', label: 'Antminer S19XP' },
  { value: 'miner-am-s19xp_h', label: 'Antminer S19XP Hyd' },
  { value: 'miner-av-a1346', label: 'Avalon A1346' },
  { value: 'miner-wm-m30sp', label: 'WhatsMiner M30SP' },
  { value: 'miner-wm-m56s', label: 'WhatsMiner M56S' },
  { value: 'miner-acme-m1', label: 'Acme M1' },
]

const CONTAINER_OPTIONS: MultiSelectOption[] = [
  { value: 'bitdeer-1a', label: 'Bitdeer 1A' },
  { value: 'bitdeer-4a', label: 'Bitdeer 4A' },
  { value: 'bitdeer-9b', label: 'Bitdeer 9B' },
  { value: 'microbt-1', label: 'MicroBT 1' },
  { value: 'bitmain-imm-1', label: 'Bitmain IMM 1' },
]

const STATUS_OPTIONS: MultiSelectOption[] = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'maintenance', label: 'Maintenance', disabled: true },
  { value: 'error', label: 'Error' },
]

export const MultiSelectPage = (): JSX.Element => {
  const [controlledValue, setControlledValue] = useState<string[]>([])

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Multi-Select"
        description="Pick multiple values via dropdown checkboxes. Built on Radix Popover + Checkbox; stays open on toggle. Designed for filter rows (miner type, mining unit, status)."
      />

      <DemoBlock
        title="Basic (uncontrolled)"
        description="No value/onValueChange. Manages its own state via defaultValue."
      >
        <MultiSelect options={MINER_TYPE_OPTIONS} placeholder="Filter by miner type" />
      </DemoBlock>

      <DemoBlock
        title="Controlled"
        description="Consumer owns the value via React state. Selecting an option fires onValueChange with the next array."
      >
        <MultiSelect
          options={CONTAINER_OPTIONS}
          value={controlledValue}
          onValueChange={setControlledValue}
          placeholder="Filter by mining unit"
        />
        <p>Selected: {controlledValue.length === 0 ? '(none)' : controlledValue.join(', ')}</p>
      </DemoBlock>

      <DemoBlock
        title="Pre-selected via defaultValue"
        description="Uncontrolled, but starts with a non-empty selection."
      >
        <MultiSelect
          options={MINER_TYPE_OPTIONS}
          defaultValue={['miner-am-s19xp', 'miner-wm-m56s']}
          placeholder="Filter by miner type"
        />
      </DemoBlock>

      <DemoBlock
        title="Disabled (whole component)"
        description="Trigger does not open; existing selections are still rendered."
      >
        <MultiSelect
          options={MINER_TYPE_OPTIONS}
          defaultValue={['miner-acme-m1']}
          placeholder="Filter by miner type"
          disabled
        />
      </DemoBlock>

      <DemoBlock
        title="Disabled individual option"
        description="The Maintenance row is disabled and can't be toggled."
      >
        <MultiSelect options={STATUS_OPTIONS} placeholder="Filter by status" />
      </DemoBlock>

      <DemoBlock title="Sizes" description="sm / md / lg mirror the Select sizing tokens.">
        <MultiSelect options={STATUS_OPTIONS} placeholder="Small" size="sm" />
        <MultiSelect options={STATUS_OPTIONS} placeholder="Medium" size="md" />
        <MultiSelect options={STATUS_OPTIONS} placeholder="Large (default)" size="lg" />
      </DemoBlock>

      <DemoBlock
        title="Variant: colored"
        description="Tinted background + colored text (matches the Select colored variant)."
      >
        <MultiSelect
          options={STATUS_OPTIONS}
          defaultValue={['online']}
          placeholder="Filter by status"
          variant="colored"
        />
      </DemoBlock>

      <DemoBlock
        title="Empty options"
        description="Renders the emptyMessage instead of an option list."
      >
        <MultiSelect options={[]} placeholder="Nothing to filter" emptyMessage="No options yet" />
      </DemoBlock>

      <DemoBlock
        title="Overflow: maxSelectedDisplay"
        description="When the selection exceeds maxSelectedDisplay, the rest collapse into a +N more chip."
      >
        <MultiSelect
          options={MINER_TYPE_OPTIONS}
          defaultValue={['miner-am-s19xp', 'miner-am-s19xp_h', 'miner-av-a1346', 'miner-wm-m56s']}
          maxSelectedDisplay={2}
          placeholder="Filter by miner type"
        />
      </DemoBlock>
    </section>
  )
}
