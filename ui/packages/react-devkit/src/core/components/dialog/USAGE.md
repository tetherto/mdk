# Dialog

A modal dialog built on Radix UI `@radix-ui/react-dialog`. Provides composable primitives plus a high-level `DialogContent` that handles the overlay, portal, title, description, and optional close button in one component.

## Exports

| Name | Description |
| ---- | ----------- |
| `Dialog` | Root compound component (`Radix Root`) |
| `DialogTrigger` | Element that opens the dialog |
| `DialogPortal` | Renders dialog into a portal |
| `DialogOverlay` | Dark backdrop |
| `DialogContent` | Panel with built-in header, title, description, close button, and portal/overlay handling |
| `DialogHeader` | Header container with optional close button |
| `DialogTitle` | Accessible dialog title |
| `DialogDescription` | Accessible description |
| `DialogFooter` | Footer container |
| `DialogClose` | Raw Radix close primitive |

## `DialogContent` Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `title` | `string` | no | — | Renders `DialogTitle` (and optional `DialogDescription`) inside the header |
| `description` | `string` | no | — | Renders `DialogDescription` below the title |
| `closable` | `boolean` | no | — | Shows an ✕ close button in the header |
| `onClose` | `VoidFunction` | no | — | Fired when the ✕ button is clicked |
| `bare` | `boolean` | no | `false` | Applies `mdk-dialog__header--bare` to the header |
| `closeOnClickOutside` | `boolean` | no | `true` | Whether clicking the overlay closes the dialog |
| `closeOnEscape` | `boolean` | no | `true` | Whether pressing Escape closes the dialog |
| `className` | `string` | no | — | Additional class for the content panel |

## `DialogHeader` Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `closable` | `boolean` | no | — | Renders a close button |
| `onClose` | `VoidFunction` | no | — | Fired when the close button is clicked |
| `bare` | `boolean` | no | `false` | Applies bare header style |

## Example

```tsx
import { Dialog, DialogContent, DialogFooter, Button } from "@tetherto/mdk-core-ui"

const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    title="Confirm Action"
    description="This will apply the changes."
    closable
    onClose={() => setOpen(false)}
    closeOnClickOutside={false}
  >
    <p>Are you sure you want to proceed?</p>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Notes

- `DialogContent` omits `aria-describedby` automatically when no `description` is provided.
- Use `DialogTrigger` for uncontrolled open state; use the `open` / `onOpenChange` props on `Dialog` for controlled usage.
