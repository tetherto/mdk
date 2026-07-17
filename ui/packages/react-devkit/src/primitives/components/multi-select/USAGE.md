# MultiSelect

Pick multiple values from a dropdown. Built on Radix Popover + the core
Checkbox so it stays open on toggle - the canonical Radix pattern for
multi-select (Radix Select itself is single-select by design).

Use for filter rows (miner type, mining unit, status), multi-target
actions, or any tag-style input. For a single-value picker use `<Select>`
instead.

## Props

| Prop                  | Type                                       | Required | Default       | Description                                                                                       |
| --------------------- | ------------------------------------------ | -------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `options`             | `MultiSelectOption[]`                      | yes      | -             | `{ value, label, disabled? }` entries to render as option rows.                                   |
| `value`               | `string[]`                                 | no       | -             | Controlled selected values. Omit to use `defaultValue`.                                           |
| `defaultValue`        | `string[]`                                 | no       | `[]`          | Initial values for uncontrolled mode. Ignored when `value` is provided.                           |
| `onValueChange`       | `(next: string[]) => void`                 | no       | -             | Fires with the next array on toggle / chip remove / clear-all.                                    |
| `placeholder`         | `ReactNode`                                | no       | `'Select...'` | Rendered when nothing is selected.                                                                |
| `disabled`            | `boolean`                                  | no       | `false`       | Disables the trigger (popover does not open).                                                     |
| `size`                | `'sm' \| 'md' \| 'lg'`                     | no       | `'lg'`        | Trigger sizing tokens. Mirror the `<Select>` sizes.                                               |
| `variant`             | `'default' \| 'colored'`                   | no       | `'default'`   | `'colored'` paints the trigger in the primary tint (matches `<Select>`'s colored variant).        |
| `emptyMessage`        | `ReactNode`                                | no       | `'No options'`| Rendered inside the popover when `options` is empty.                                              |
| `maxSelectedDisplay`  | `number`                                   | no       | -             | Collapse selections beyond this count into a `+N more` chip. Omit to render every selected chip.  |
| `className`           | `string`                                   | no       | -             | Extra class on the trigger button.                                                                |
| `contentClassName`    | `string`                                   | no       | -             | Extra class on the popover content.                                                               |
| `aria-label`          | `string`                                   | no       | -             | Accessible label applied to the trigger.                                                          |

`MultiSelectOption.disabled` blocks toggling that row only; the rest of the
list remains interactive.

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
  ergonomic without re-opening on every change.
- Clear-all surfaces in the trigger only when `>= 2` values are selected.
- Per-chip `x` buttons are not in the tab order (the parent trigger handles
  focus); they remove only that value on click.
- Keyboard: Enter / Space on the trigger opens the popover, Arrow Down / Up
  move focus through rows, Space toggles the focused row without closing,
  Esc closes and returns focus to the trigger.
