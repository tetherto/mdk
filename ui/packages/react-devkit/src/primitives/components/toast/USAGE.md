# Toast / toaster

Transient notifications shown in a corner of the viewport, built on Radix UI.
The simplest path is `<Toaster>` (Provider + Viewport in one) wrapping a
list of `<Toast>` elements.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `Toast` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `title` | Required | `string` | - | Title shown at the top of the toast |
| `description` | Optional | `string` | - | Body text |
| `duration` | Optional | `number` | - | Auto-dismiss after N ms |
| `icon` | Optional | `React.JSX.Element` | - | Override the default variant icon |
| `onOpenChange` | Optional | `((open: boolean) => void)` | - | Open-state change handler |
| `open` | Optional | `boolean` | - | Controlled open state |
| `variant` | Optional | `"success" \| "info" \| "warning" \| "error"` | `"info"` | Determines the icon and accent |

### `Toaster` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | The `<Toast>` elements to render |
| `position` | Optional | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right" \| "top-center" \| "bottom-center"` | `"top-left"` | Where the viewport is anchored |
<!-- END GENERATED: props -->

## Example

```tsx
<Toaster position="bottom-right">
  <Toast title="Saved" description="Your changes were saved." variant="success" />
</Toaster>
```

In practice, render toasts from state managed by `useNotification`:

```tsx
const { notifications } = useNotification();

<Toaster position="bottom-right">
  {notifications.map((n) => (
    <Toast key={n.id} title={n.title} description={n.description} variant={n.variant} />
  ))}
</Toaster>;
```

## Notes

- The compound parts (`ToastProvider`, `ToastViewport`) are available for
  fine-grained control; most code should stick to `<Toaster>`
- Place exactly one `<Toaster>` in your app root
