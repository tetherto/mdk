# Accordion

Collapsible panel with a title trigger and animated content area. Exports both a high-level `Accordion` wrapper and composable primitives (`AccordionRoot`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`).

## Props

### `Accordion`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `title` | `string` | no | `''` | Header label shown in the trigger button |
| `isOpened` | `boolean` | no | `false` | Whether the panel starts expanded |
| `isRow` | `boolean` | no | `false` | Lays out the content area as a flex row instead of column |
| `unpadded` | `boolean` | no | `false` | Removes the default inner padding from the content area |
| `noBorder` | `boolean` | no | `false` | Removes the bottom border from the trigger |
| `solidBackground` | `boolean` | no | `false` | Applies a solid background to the accordion container |
| `showToggleIcon` | `boolean` | no | `true` | Shows/hides the expand/collapse chevron icon |
| `toggleIconPosition` | `'left' \| 'right'` | no | `'left'` | Side on which the toggle icon appears |
| `customLabel` | `React.ReactNode` | no | — | Extra content (e.g. a badge) rendered in the trigger header |
| `onValueChange` | `(value: string \| string[]) => void` | no | — | Fired when the open/close state changes |
| `className` | `string` | no | — | Additional class for the root element |
| `children` | `React.ReactNode` | no | — | Content rendered inside the panel |

### `AccordionTrigger` (composable)

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `showToggleIcon` | `boolean` | no | `true` | Shows/hides the toggle icon |
| `toggleIconPosition` | `'left' \| 'right'` | no | `'left'` | Icon placement |
| `customLabel` | `React.ReactNode` | no | — | Slot for extra content in the trigger header |
| `timestamp` | `string` | no | — | Optional timestamp string (available via props) |

### `AccordionItem` / `AccordionContent`

Thin wrappers around Radix UI `AccordionPrimitive.Item` and `AccordionPrimitive.Content`. Accept all native Radix props plus an optional `className`.

## Example

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@tetherto/mdk-react-devkit"

// High-level usage
<Accordion title="Device details" isOpened>
  <p>Panel content goes here.</p>
</Accordion>

// With a badge in the trigger
<Accordion
  title="Alerts"
  customLabel={<Tag color="red">3</Tag>}
  showToggleIcon={false}
>
  <ul>…</ul>
</Accordion>

// Composable primitives
<AccordionRoot type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Question 1</AccordionTrigger>
    <AccordionContent>Answer 1</AccordionContent>
  </AccordionItem>
</AccordionRoot>
```

## Notes

- `Accordion` wraps the primitives with `type="multiple"` and a single hard-coded item value; use `AccordionRoot` directly when you need multi-item control.
- `toggleIconPosition="right"` swaps to `PlusIcon`/`MinusIcon` style; `"left"` uses `ChevronDown`/`ChevronRight`.
