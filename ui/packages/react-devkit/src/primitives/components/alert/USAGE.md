# Alert

Contextual feedback banner for success, info, warning, and error messages. Supports icons, close button, an action slot, and an optional full-width banner mode.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `type` | `'success' \| 'info' \| 'warning' \| 'error'` | no | `'info'` | Controls color scheme and default icon |
| `title` | `React.ReactNode` | no | — | Primary message content |
| `description` | `React.ReactNode` | no | — | Secondary/detail content shown below the title |
| `showIcon` | `boolean` | no | `false` | Renders the type icon (or `icon` override) before the content |
| `icon` | `React.ReactNode` | no | — | Custom icon; only used when `showIcon` is `true` |
| `closable` | `boolean` | no | `false` | Shows an ✕ button; clicking it hides the alert |
| `onClose` | `React.MouseEventHandler<HTMLButtonElement>` | no | — | Fired after the close button is clicked |
| `banner` | `boolean` | no | `false` | Renders without border radius or margin (full-width banner style) |
| `action` | `React.ReactNode` | no | — | Content rendered to the right of the message (e.g. a button) |
| `className` | `string` | no | — | Additional class for the root `div` |
| `style` | `React.CSSProperties` | no | — | Inline styles for the root `div` |

## Example

```tsx
import { CoreAlert } from '@tetherto/mdk-react-devkit'

<CoreAlert type="success" title="Saved successfully" showIcon />

<CoreAlert
  type="warning"
  title="Low hashrate detected"
  description="Average hashrate dropped below threshold."
  showIcon
  closable
/>

<CoreAlert
  type="error"
  title="Connection lost"
  action={<Button onClick={retry}>Retry</Button>}
/>

{/* Full-width banner */}
<CoreAlert type="info" title="Maintenance window tonight" banner />
```

## Notes

- Once closed via the ✕ button, the component returns `null` and cannot be reopened without unmounting/remounting.
- Setting `description` automatically adds the `mdk-alert--with-description` modifier for extra spacing.
