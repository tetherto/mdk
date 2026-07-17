# Mosaic

A CSS Grid layout component that maps named areas to child `Mosaic.Item` elements. Supports 1D (space-separated string rows) and 2D array templates.

## Props

### `Mosaic`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `template` | `string[] \| string[][]` | yes | — | Grid area layout. 1D: each string is a row of space-separated area names. 2D: each inner array is a row. |
| `children` | `React.ReactNode` | yes | — | `Mosaic.Item` elements |
| `gap` | `string` | no | `'12px'` | CSS gap between grid cells |
| `rowHeight` | `string` | no | `'auto'` | CSS height for each row |
| `columns` | `string \| string[]` | no | — | Custom `grid-template-columns` value or array of track sizes. Defaults to equal-width fractional tracks. |
| `className` | `string` | no | — | Additional class for the grid element |

### `Mosaic.Item`

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `area` | `string` | no | — | Grid area name (must match a name used in `template`) |
| `children` | `React.ReactNode` | no | — | Item content |
| `className` | `string` | no | — | Additional class for the item element |

All other `div` HTML attributes are forwarded.

## Example

```tsx
import { Mosaic } from "@tetherto/mdk-react-devkit"

// 2D array template
<Mosaic
  template={[
    ["header", "header"],
    ["sidebar", "content"],
    ["footer", "footer"],
  ]}
  gap="16px"
>
  <Mosaic.Item area="header"><Header /></Mosaic.Item>
  <Mosaic.Item area="sidebar"><Sidebar /></Mosaic.Item>
  <Mosaic.Item area="content"><Main /></Mosaic.Item>
  <Mosaic.Item area="footer"><Footer /></Mosaic.Item>
</Mosaic>

// 1D string template
<Mosaic
  template={[
    "header header header",
    "nav    main   aside",
    "footer footer footer",
  ]}
  columns={["200px", "1fr", "300px"]}
>
  ...
</Mosaic>
```

## Notes

- CSS `grid-area` names cannot start with a digit; `Mosaic` automatically prefixes numeric names with `'a'` (e.g. area `'1'` becomes `'a1'`).
- Use `.` in the template to leave a cell empty.
- On mobile (below the SCSS breakpoint) the grid stacks as a single column by default.
