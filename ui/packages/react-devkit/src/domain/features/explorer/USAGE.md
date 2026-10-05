# `ExplorerLayout`

Explorer split-view shell: a header, a scrollable list column, and a sticky
detail column that appears when a row is selected (stacking on narrow
viewports). Purely presentational — the page supplies the list (tabs + table)
and the detail panel, and owns selection/routing state.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `list` | Required | `React.ReactNode` | - | The list column — typically a tab switch plus the device/container table |
| `className` | Optional | `string` | - | Additional class for the root element |
| `detail` | Optional | `React.ReactNode` | - | The detail column content (shown in the sticky panel when `hasSelection`) |
| `hasSelection` | Optional | `boolean` | `false` | When true the layout splits into list (70%) + a sticky detail column (30%); otherwise the list fills the width. Driven by whether a row is selected |
| `headerActions` | Optional | `React.ReactNode` | - | Optional header controls (export button, etc.) shown next to the title |
| `title` | Optional | `string` | - | Page heading; nothing renders when omitted |
<!-- END GENERATED: props -->

## Example

```tsx
import { ExplorerLayout } from "@tetherto/mdk-react-devkit"

<ExplorerLayout
  hasSelection={Boolean(selectedId)}
  list={<>{tabs}{table}</>}
  detail={selectedId ? <DetailsPanel id={selectedId} /> : <EmptyState description="Select a row" />}
/>
```

## Notes

- The detail column is sticky on wide viewports and stacks below the list under
  ~992px
- The layout does not fetch data or own selection state — wire it in the shell
  page to the explorer read hooks and URL/selection state
