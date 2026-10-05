# Alert

Contextual feedback banner for success, info, warning, and error messages. Supports icons, close button, an action slot, and an optional full-width banner mode.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `action` | Optional | `React.ReactNode` | - | Action element rendered to the right |
| `banner` | Optional | `boolean` | `false` | Display as full-width banner (no border radius, no margin) |
| `className` | Optional | `string` | - | Custom className |
| `closable` | Optional | `boolean` | `false` | Shows an ✕ button; clicking it hides the alert |
| `description` | Optional | `React.ReactNode` | - | Secondary/detail content shown below the title |
| `icon` | Optional | `React.ReactNode` | - | Custom icon (used when showIcon is true) |
| `onClose` | Optional | `React.MouseEventHandler<HTMLButtonElement>` | - | Called when close button is clicked |
| `showIcon` | Optional | `boolean` | `false` | Renders the type icon (or the `icon` override) before the content |
| `style` | Optional | `React.CSSProperties` | - | Custom styles |
| `title` | Optional | `React.ReactNode` | - | Main message |
| `type` | Optional | `"success" \| "info" \| "warning" \| "error"` | `"info"` | Controls the color scheme and default icon |
<!-- END GENERATED: props -->

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

- Once closed via the ✕ button, the component returns `null` and cannot be reopened without unmounting/remounting
- Setting `description` automatically adds the `mdk-alert--with-description` modifier for extra spacing
