# ExplorerLayout

Explorer split-view shell: a header, a scrollable list column, and a sticky
detail column that appears when a row is selected (stacking on narrow
viewports). Purely presentational — the page supplies the list (tabs + table)
and the detail panel, and owns selection/routing state.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `list` | `ReactNode` | yes | — | List column content (tab switch + device/container table) |
| `detail` | `ReactNode` | no | — | Detail column content, shown in the sticky panel when `hasSelection` |
| `hasSelection` | `boolean` | no | `false` | Splits into list (70%) + sticky detail (30%); otherwise list fills the width |
| `title` | `string` | no | `"Explorer"` | Page heading |
| `headerActions` | `ReactNode` | no | — | Controls shown next to the title (e.g. an export button) |
| `className` | `string` | no | — | Additional class for the root element |

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
  ~992px.
- The layout does not fetch data or own selection state — wire it in the shell
  page to the explorer read hooks and URL/selection state.
