# TextArea

A multi-line text input with optional label, error message, and accessible markup. Renders as a `<textarea>` element.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `label` | `string` | no | — | Label text rendered above the textarea |
| `id` | `string` | no | auto-generated | HTML id for the textarea; required for label association when providing `label` |
| `error` | `string` | no | — | Validation error message shown below the textarea; also applies error styling |
| `wrapperClassName` | `string` | no | — | Additional class for the root wrapper element |
| `className` | `string` | no | — | Additional class for the `<textarea>` element |
| `disabled` | `boolean` | no | — | Disables the textarea |

All other native `textarea` HTML attributes are forwarded (e.g. `rows`, `placeholder`, `value`, `onChange`).

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

- When an `error` is provided, the textarea receives `aria-invalid` and `aria-describedby` pointing to the error message for screen reader accessibility.
- When no `label` is provided, `wrapperClassName` is applied directly to the inner wrapper `div`; when a label is present, it applies to the outer root `div`.
