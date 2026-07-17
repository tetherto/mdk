# Badge

Small status indicator displayed standalone or overlaid on another element.
Renders as a number, dot, custom text, or status pill.

## Props

| Prop               | Type                                                            | Required | Default     | Description                                            |
| ------------------ | --------------------------------------------------------------- | -------- | ----------- | ------------------------------------------------------ |
| `children`         | `ReactNode`                                                     | no       | —           | Element to overlay the badge onto.                     |
| `count`            | `number`                                                        | no       | `0`         | Number to display.                                     |
| `overflowCount`    | `number`                                                        | no       | `99`        | Above this, renders as e.g. `99+`.                     |
| `showZero`         | `boolean`                                                       | no       | `false`     | Render the badge when `count === 0`.                   |
| `dot`              | `boolean`                                                       | no       | `false`     | Render as a dot instead of a number.                   |
| `text`             | `string`                                                        | no       | —           | Custom text content (overrides `count`).               |
| `color`            | `ColorVariant`                                                  | no       | `"primary"` | Color variant.                                         |
| `size`             | `ComponentSize`                                                 | no       | `"md"`      | `"sm" \| "md" \| "lg"`.                                |
| `square`           | `boolean`                                                       | no       | `false`     | Square (no border-radius) badge.                       |
| `status`           | `"success" \| "processing" \| "error" \| "warning" \| "default"` | no      | —           | Renders a status dot with optional text.               |
| `offset`           | `[number, number]`                                              | no       | `[0, 0]`    | Pixel offset when overlaid on `children`.              |
| `className`        | `string`                                                        | no       | —           | Badge element class names.                             |
| `wrapperClassName` | `string`                                                        | no       | —           | Wrapper class names (only when wrapping `children`).   |
| `title`            | `string`                                                        | no       | —           | Accessible label.                                      |

## Example

```tsx
<Badge count={5}><Button>Messages</Button></Badge>
<Badge dot><BellIcon /></Badge>
<Badge status="success" text="Online" />
<Badge count={120} overflowCount={99} />
```

## Notes

- When used without `children`, renders standalone.
- `dot` and `status` ignore `count` / `text` for the visual but keep `text` as the label when `status` is set.
