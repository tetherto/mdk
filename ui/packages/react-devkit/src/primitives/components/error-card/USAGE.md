# `ErrorCard`

Displays one or more error messages in a card or inline style. Multi-line messages are supported using `\n` separators.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `error` | Required | `string` | - | Error message string. Supports `\\n` for line breaks |
| `className` | Optional | `string` | - | Additional CSS class name |
| `title` | Optional | `string` | `"Errors"` | Title displayed above the error message |
| `variant` | Optional | `"inline" \| "card"` | `"card"` | Display variant. "card" shows a bordered container, "inline" shows flat text |
<!-- END GENERATED: props -->

## Example

```tsx
import { ErrorCard } from "@tetherto/mdk-react-devkit"

<ErrorCard error="Connection timed out" />

<ErrorCard
  title="Validation Errors"
  error={"Field 'name' is required\nField 'email' must be valid"}
  variant="inline"
/>
```
