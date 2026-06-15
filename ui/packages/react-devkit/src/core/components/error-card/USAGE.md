# ErrorCard

Displays one or more error messages in a card or inline style. Multi-line messages are supported using `\n` separators.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `error` | `string` | yes | — | Error message string. Use `\n` to split into multiple lines. |
| `title` | `string` | no | `'Errors'` | Heading displayed above the error text |
| `variant` | `'card' \| 'inline'` | no | `'card'` | `'card'` shows a bordered container; `'inline'` shows flat text |
| `className` | `string` | no | — | Additional class for the root element |

## Example

```tsx
import { ErrorCard } from "@tetherto/mdk-core-ui"

<ErrorCard error="Connection timed out" />

<ErrorCard
  title="Validation Errors"
  error={"Field 'name' is required\nField 'email' must be valid"}
  variant="inline"
/>
```
