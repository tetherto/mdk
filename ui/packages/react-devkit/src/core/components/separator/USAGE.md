# Separator

A thin re-export of `@radix-ui/react-separator`. Use it to render a semantic horizontal or vertical divider.

## Exports

All Radix UI `@radix-ui/react-separator` named exports are re-exported as-is:

| Name | Description |
| ---- | ----------- |
| `Root` | The separator element with ARIA `role="separator"` (or `"presentation"` when `decorative`) |

For the full prop reference see the [Radix UI Separator docs](https://www.radix-ui.com/primitives/docs/components/separator).

## Example

```tsx
import { Root as Separator } from "@tetherto/mdk-core-ui"

<Separator orientation="horizontal" decorative className="my-separator" />
```

## Notes

- If you need a styled divider with optional label support, use the `Divider` component instead.
