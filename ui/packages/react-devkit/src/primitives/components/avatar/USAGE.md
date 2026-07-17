# Avatar

Composable image avatar with an automatic fallback. Wraps Radix UI `@radix-ui/react-avatar`.

## Exports

| Name | Description |
| ---- | ----------- |
| `Avatar` | Root container (`mdk-avatar`) |
| `AvatarImage` | The `<img>` element (`mdk-avatar__image`) |
| `AvatarFallback` | Content shown while the image is loading or fails (`mdk-avatar__fallback`) |

All three components accept a `className` prop and forward their `ref`. All native Radix props are also passed through.

## Example

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@tetherto/mdk-react-devkit"

<Avatar>
  <AvatarImage src="https://example.com/user.png" alt="Jane Doe" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

## Notes

- `AvatarFallback` is only rendered while the image is loading or when the image fails to load; Radix handles the visibility automatically.
- Size and shape are controlled via CSS — apply utility classes or override `mdk-avatar` dimensions via CSS variables.
