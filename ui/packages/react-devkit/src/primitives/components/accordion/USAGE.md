# Accordion

Collapsible panel with a title trigger and animated content area. Exports both a high-level `Accordion` wrapper and composable primitives (`AccordionRoot`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `Accordion` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `customLabel` | Optional | `React.ReactNode` | - | Extra content (e.g. a badge) rendered in the trigger header |
| `isOpened` | Optional | `boolean` | `false` | Whether the panel starts expanded |
| `isRow` | Optional | `boolean` | `false` | Lays out the content area as a flex row instead of column |
| `noBorder` | Optional | `boolean` | `false` | Removes the bottom border from the trigger |
| `onValueChange` | Optional | `((value: string \| string[]) => void)` | - | Fired when the open/close state changes |
| `showToggleIcon` | Optional | `boolean` | `true` | Shows/hides the expand/collapse chevron icon |
| `solidBackground` | Optional | `boolean` | `false` | Applies a solid background to the accordion container |
| `title` | Optional | `string` | `""` | Header label shown in the trigger button |
| `toggleIconPosition` | Optional | `"left" \| "right"` | `"left"` | Side on which the toggle icon appears |
| `unpadded` | Optional | `boolean` | `false` | Removes the default inner padding from the content area |

### `AccordionTrigger` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `customLabel` | Optional | `React.ReactNode` | - | Slot for extra content in the trigger header |
| `showToggleIcon` | Optional | `boolean` | `true` | Shows/hides the toggle icon |
| `timestamp` | Optional | `string` | - | Forwarded to the underlying Radix trigger element; not rendered by the component |
| `toggleIconPosition` | Optional | `"left" \| "right"` | `"left"` | Side on which the toggle icon appears |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

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

- `Accordion` wraps the primitives with `type="multiple"` and a single hard-coded item value; use `AccordionRoot` directly when you need multi-item control
- `toggleIconPosition="right"` swaps to `PlusIcon`/`MinusIcon` style; `"left"` uses `ChevronDown`/`ChevronRight`
