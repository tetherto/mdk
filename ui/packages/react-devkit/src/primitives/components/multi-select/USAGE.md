# `MultiSelect`

Pick multiple values from a dropdown. Built on Radix Popover + the core
Checkbox so it stays open on toggle - the canonical Radix pattern for
multi-select (Radix Select itself is single-select by design).

Use for filter rows (miner type, mining unit, status), multi-target
actions, or any tag-style input. For a single-value picker use `<Select>`
instead.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `options` | Required | `MultiSelectOption[]` | - | `{ value, label, disabled? }` entries to render as option rows |
| `aria-label` | Optional | `string` | - | Accessible label - applied to the trigger button |
| `className` | Optional | `string` | - | Extra class on the trigger button |
| `contentClassName` | Optional | `string` | - | Extra class on the popover content |
| `defaultValue` | Optional | `string[]` | `[]` | Initial values for uncontrolled mode. Ignored when `value` is provided |
| `disabled` | Optional | `boolean` | `false` | Disables the trigger (popover does not open) |
| `emptyMessage` | Optional | `React.ReactNode` | `"No options"` | Rendered inside the popover when `options` is empty |
| `id` | Optional | `string` | - | - |
| `maxSelectedDisplay` | Optional | `number` | - | Max number of selected chips rendered in the trigger before collapsing the rest into a "+N more" badge. `undefined` (default) renders every chip |
| `name` | Optional | `string` | - | - |
| `onValueChange` | Optional | `((next: string[]) => void)` | - | Fires with the next array on toggle / chip remove / clear-all |
| `placeholder` | Optional | `React.ReactNode` | `"Select..."` | Rendered when nothing is selected |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"lg"` | Trigger sizing tokens. Mirror the `<Select>` sizes |
| `value` | Optional | `string[]` | - | Controlled selected values. Omit to use `defaultValue` for uncontrolled mode |
| `variant` | Optional | `"default" \| "colored"` | `"default"` | `'colored'` paints the trigger in the primary tint (matches `<Select>`'s colored variant) |
<!-- END GENERATED: props -->

## Example

```tsx
import { useState } from 'react'
import { MultiSelect, type MultiSelectOption } from '@tetherto/mdk-react-devkit/primitives'

const MINER_TYPES: MultiSelectOption[] = [
  { value: 'miner-am-s19xp', label: 'Antminer S19XP' },
  { value: 'miner-wm-m56s', label: 'WhatsMiner M56S' },
  { value: 'miner-demo-m1', label: 'Demo M1' },
]

export const ExampleUsage = () => {
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
```

## Behaviour notes

- The popover **stays open** after toggling an option so multi-pick is
  ergonomic without re-opening on every change
- Clear-all surfaces in the trigger only when `>= 2` values are selected
- Per-chip `x` buttons are not in the tab order (the parent trigger handles
  focus); they remove only that value on click
- Keyboard: Enter / Space on the trigger opens the popover, Arrow Down / Up
  move focus through rows, Space toggles the focused row without closing,
  Esc closes and returns focus to the trigger
