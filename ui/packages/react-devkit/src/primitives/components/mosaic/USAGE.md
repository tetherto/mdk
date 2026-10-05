# Mosaic

A CSS Grid layout component that maps named areas to child `Mosaic.Item` elements. Supports 1D (space-separated string rows) and 2D array templates.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | `Mosaic.Item` elements |
| `template` | Required | `string[] \| string[][]` | - | Grid area layout. 1D: each string is a row of space-separated area names. 2D: each inner array is a row |
| `className` | Optional | `string` | - | Additional class for the grid element |
| `columns` | Optional | `string \| string[]` | - | Custom `grid-template-columns` value or array of track sizes. Defaults to equal-width fractional tracks |
| `gap` | Optional | `string` | `"12px"` | CSS gap between grid cells |
| `rowHeight` | Optional | `string` | `"auto"` | CSS height for each row |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `Mosaic.Item`

| Prop        | Status   | Type              | Default | Description                                           |
| ----------- | -------- | ----------------- | ------- | ----------------------------------------------------- |
| `area`      | Optional | `string`          | —       | Grid area name (must match a name used in `template`) |
| `children`  | Optional | `React.ReactNode` | —       | Item content                                          |
| `className` | Optional | `string`          | —       | Additional class for the item element                 |

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

- CSS `grid-area` names cannot start with a digit; `Mosaic` automatically prefixes numeric names with `'a'` (e.g. area `'1'` becomes `'a1'`)
- Use `.` in the template to leave a cell empty
- On mobile (below the SCSS breakpoint) the grid stacks as a single column by default
