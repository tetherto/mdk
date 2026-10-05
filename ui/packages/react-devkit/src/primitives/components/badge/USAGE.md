# Badge

Small status indicator displayed standalone or overlaid on another element.
Renders as a number, dot, custom text, or status pill.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Optional | `React.ReactNode` | - | Badge content (wraps children with badge) |
| `className` | Optional | `string` | - | Custom className for badge |
| `color` | Optional | `"success" \| "info" \| "warning" \| "error" \| "primary" \| "secondary" \| "default"` | `"primary"` | Color variant |
| `count` | Optional | `number` | `0` | Number to display in badge If > overflowCount, will show "overflowCount+" |
| `dot` | Optional | `boolean` | `false` | Show badge as a dot |
| `offset` | Optional | `[number, number]` | `[0, 0]` | Offset position [x, y] in pixels |
| `overflowCount` | Optional | `number` | `99` | Maximum count to display |
| `showZero` | Optional | `boolean` | `false` | Whether to show badge when count is 0 |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Badge size |
| `square` | Optional | `boolean` | `false` | Square badge (no border-radius) |
| `status` | Optional | `"success" \| "warning" \| "error" \| "default" \| "processing"` | - | Status badge (small dot badge with text) |
| `text` | Optional | `string` | - | Custom badge content (overrides count) |
| `title` | Optional | `string` | - | Badge title for accessibility |
| `wrapperClassName` | Optional | `string` | - | Custom className for wrapper |
<!-- END GENERATED: props -->

## Example

```tsx
<Badge count={5}><Button>Messages</Button></Badge>
<Badge dot><BellIcon /></Badge>
<Badge status="success" text="Online" />
<Badge count={120} overflowCount={99} />
```

## Notes

- When used without `children`, renders standalone
- `dot` and `status` ignore `count` / `text` for the visual but keep `text` as the label when `status` is set
