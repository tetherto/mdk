# AlertDialog

A set of composable primitives wrapping Radix UI `@radix-ui/react-alert-dialog` with MDK class names. Use for destructive confirmations that should block interaction with the rest of the page.

## Exports

| Name | Description |
| ---- | ----------- |
| `AlertDialog` | Root compound component (Radix `Root`) |
| `AlertDialogTrigger` | Button that opens the dialog (Radix `Trigger`) |
| `AlertDialogPortal` | Renders the dialog into a portal |
| `AlertDialogOverlay` | Dark backdrop |
| `AlertDialogContent` | Dialog panel rendered inside the portal |
| `AlertDialogHeader` | Header container (`div`) |
| `AlertDialogFooter` | Footer container (`div`) |
| `AlertDialogTitle` | Accessible dialog title |
| `AlertDialogDescription` | Accessible description |
| `AlertDialogAction` | Confirm button — styled with `mdk-button--variant-primary` |
| `AlertDialogCancel` | Cancel button — styled with `mdk-button--variant-outline` |

All components forward their `ref` and accept `className` for additional styling.

## Example

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@tetherto/mdk-react-devkit"

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="danger">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Notes

- `AlertDialogContent` automatically renders `AlertDialogPortal` and `AlertDialogOverlay` — you do not need to wrap them manually.
- Unlike `Dialog`, `AlertDialog` does not close when clicking outside or pressing Escape by default (Radix behaviour for alert dialogs).
