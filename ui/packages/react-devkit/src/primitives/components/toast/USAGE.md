# Toast / Toaster

Transient notifications shown in a corner of the viewport, built on Radix UI.
The simplest path is `<Toaster>` (Provider + Viewport in one) wrapping a
list of `<Toast>` elements.

## `Toaster` props

| Prop        | Type                                                                                            | Required | Default       | Description                              |
| ----------- | ----------------------------------------------------------------------------------------------- | -------- | ------------- | ---------------------------------------- |
| `children`  | `ReactNode`                                                                                     | yes      | —             | The `<Toast>` elements to render.        |
| `position`  | `"top-left" \| "top-center" \| "top-right" \| "bottom-left" \| "bottom-center" \| "bottom-right"` | no    | `"top-left"`  | Where the viewport is anchored.          |

All other `ToastProvider` props are forwarded.

## `Toast` props

| Prop          | Type                                                | Required | Default     | Description                          |
| ------------- | --------------------------------------------------- | -------- | ----------- | ------------------------------------ |
| `title`       | `string`                                            | yes      | —           | Title shown at the top of the toast. |
| `description` | `string`                                            | no       | —           | Optional body text.                  |
| `variant`     | `"success" \| "error" \| "warning" \| "info"`        | no       | `"info"`    | Determines the icon and accent.      |
| `icon`        | `JSX.Element`                                       | no       | —           | Override the default variant icon.   |
| `open`        | `boolean`                                           | no       | —           | Controlled open state.                |
| `onOpenChange`| `(open: boolean) => void`                           | no       | —           | Open-state change handler.            |
| `duration`    | `number`                                            | no       | —           | Auto-dismiss after N ms.              |

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
  fine-grained control; most code should stick to `<Toaster>`.
- Place exactly one `<Toaster>` in your app root.
