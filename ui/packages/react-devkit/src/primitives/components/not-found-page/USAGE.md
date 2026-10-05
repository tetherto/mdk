# `NotFoundPage`

A full-page 404 "not found" screen with a customizable title, message, and optional "Go Home" button.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional CSS class name |
| `message` | Optional | `string` | `"The page you are looking for does not exist."` | Message displayed below the title |
| `onGoHome` | Optional | `VoidFunction` | - | Callback fired when the "Go Home" button is clicked |
| `title` | Optional | `string` | `"404"` | Page title |
<!-- END GENERATED: props -->

## Example

```tsx
import { NotFoundPage } from "@tetherto/mdk-react-devkit"
import { useNavigate } from "react-router"

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

- When `onGoHome` is omitted the button is not rendered, giving a read-only display
