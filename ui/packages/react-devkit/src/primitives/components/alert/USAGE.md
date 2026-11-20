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
| `role` | Optional | `"alert" \| "status" \| "none"` | `"alert"` | ARIA role for the wrapper, which decides whether screen readers announce it. `'alert'` is an assertive live region — it interrupts whatever the reader is saying. Right for a message that appears in response to something the user just did, wrong for a banner that is simply part of the page: that one is re-announced on every mount, so it interrupts on every navigation. `'status'` announces politely; `'none'` renders no live region at all (the attribute is omitted) |
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

{/* Full-width banner that is part of the page, not a response to an action */}
<CoreAlert type="info" title="Maintenance window tonight" banner role="none" />
```

## Notes

- Once closed via the ✕ button, the component returns `null` and cannot be reopened without unmounting/remounting
- Setting `description` automatically adds the `mdk-alert--with-description` modifier for extra spacing
- The alert is an assertive live region by default (`role="alert"`), so a screen reader interrupts
  itself to read it. That is right for a message that appears in response to something the user just
  did — a failed sign-in, a query that errored — and wrong for a banner that is simply part of the
  page: it is re-announced every time it mounts, so a per-page banner interrupts on every navigation.
  Pass `role="status"` to announce politely instead, or `role="none"` to render no live region at
  all. `role="none"` omits the attribute rather than emitting it, and changes nothing visually
