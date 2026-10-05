# `TextArea`

A multi-line text input with optional label, error message, and accessible markup. Renders as a `<textarea>` element.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `error` | Optional | `string` | - | Validation error message. When provided, displays error styling (red border) and the message below the textarea |
| `id` | Optional | `string` | `auto-generated` | HTML id for the textarea. Required when using label for accessibility |
| `label` | Optional | `string` | - | Optional label displayed above the textarea |
| `wrapperClassName` | Optional | `string` | - | Custom className for the root wrapper |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Prop               | Status   | Type      | Default  | Description                                                                       |
| ------------------ | -------- | --------- | ---------| --------------------------------------------------------------------------------- |
| `disabled`         | Optional | `boolean` | —        | Disables the `<textarea>`                                                         |

All other native `<textarea>` HTML attributes are forwarded (e.g. `rows`, `placeholder`, `value`, `onChange`).

## Example

```tsx
import { TextArea } from "@tetherto/mdk-react-devkit"

// Basic
<TextArea placeholder="Enter notes..." rows={4} />

// With label
<TextArea
  id="notes"
  label="Notes"
  placeholder="Enter notes..."
  rows={4}
/>

// With error
<TextArea
  id="desc"
  label="Description"
  error="Description is required"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

## Notes

- When an `error` is provided, the `<textarea>` receives `aria-invalid` and `aria-describedby` pointing to the error message for screen reader accessibility
- When no `label` is provided, `wrapperClassName` is applied directly to the inner wrapper `div`; when a label is present, it applies to the outer root `div`
