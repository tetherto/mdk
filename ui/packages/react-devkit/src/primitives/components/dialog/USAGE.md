# Dialog

A modal dialog built on Radix UI `@radix-ui/react-dialog`. Provides composable primitives plus a high-level `DialogContent` that handles the overlay, portal, title, description, and optional close button in one component.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `DialogContent` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `bare` | Optional | `boolean` | `false` | Applies `mdk-dialog__header--bare` to the header |
| `closable` | Optional | `boolean` | - | Shows an ✕ close button in the header |
| `closeOnClickOutside` | Optional | `boolean` | `true` | Whether clicking the overlay closes the dialog |
| `closeOnEscape` | Optional | `boolean` | `true` | Whether pressing Escape closes the dialog |
| `description` | Optional | `string` | - | Renders `DialogDescription` below the title |
| `onClose` | Optional | `VoidFunction` | - | Fired when the ✕ button is clicked |
| `title` | Optional | `string` | - | Renders `DialogTitle` (and optional `DialogDescription`) inside the header |

### `DialogHeader` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `bare` | Optional | `boolean` | `false` | Applies `mdk-dialog__header--bare` to the header |
| `closable` | Optional | `boolean` | - | Shows an ✕ close button in the header |
| `onClose` | Optional | `VoidFunction` | - | Fired when the ✕ button is clicked |
<!-- END GENERATED: props -->

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

## Example

```tsx
import { Dialog, DialogContent, DialogFooter, Button } from "@tetherto/mdk-react-devkit"

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

- `DialogContent` omits `aria-describedby` automatically when no `description` is provided
- Use `DialogTrigger` for uncontrolled open state; use the `open` / `onOpenChange` props on `Dialog` for controlled usage
