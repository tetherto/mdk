# NotFoundPage

A full-page 404 "not found" screen with a customizable title, message, and optional "Go Home" button.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `title` | `string` | no | `'404'` | Large heading displayed at the top |
| `message` | `string` | no | `'The page you are looking for does not exist.'` | Explanatory text shown below the title |
| `onGoHome` | `VoidFunction` | no | — | When provided, renders a "Go Home" button that calls this callback |
| `className` | `string` | no | — | Additional class for the root element |

## Example

```tsx
import { NotFoundPage } from "@tetherto/mdk-core-ui"
import { useNavigate } from "react-router-dom"

const navigate = useNavigate()

<NotFoundPage onGoHome={() => navigate("/")} />

// Custom message
<NotFoundPage
  title="Page Not Found"
  message="Check the URL and try again."
  onGoHome={() => navigate("/")}
/>
```

## Notes

- When `onGoHome` is omitted the button is not rendered, giving a read-only display.
