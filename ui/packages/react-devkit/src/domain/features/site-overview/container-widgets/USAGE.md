# `ContainerWidgets`

Site Overview → Container Widgets: the read-only grid of per-container summary
cards. Purely presentational — the shell page feeds it the shaped `containers`
array (from the container-widgets data hook) and handles navigation via
`onContainerClick`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `containers` | Required | `ContainerWidgetItem[]` | - | Card-ready data for every container, shaped by the data hook |
| `className` | Optional | `string` | - | Additional class for the root element |
| `errorMessage` | Optional | `string` | - | Error message shown in place of the grid |
| `isLoading` | Optional | `boolean` | `false` | Shows a spinner while the first load is in flight |
| `onContainerClick` | Optional | `((id: string) => void)` | - | Invoked with the container id when a card is clicked |
| `title` | Optional | `string` | - | Section heading |
<!-- END GENERATED: props -->

## Example

```tsx
import { ContainerWidgets } from "@tetherto/mdk-react-devkit"
import type { ContainerWidgetItem } from "@tetherto/mdk-react-devkit"

const containers: ContainerWidgetItem[] = [
  {
    id: "container-a",
    title: "Container A",
    power: 412_000,
    powerUnit: "kW",
    summary: [
      { label: "Hash Rate", value: "1.24 PH/s" },
      { label: "Max Temp", value: "72 °C" },
    ],
    activity: { total: 210, online: 200, offline: 10 },
  },
]

<ContainerWidgets containers={containers} onContainerClick={(id) => open(id)} />
```

## Notes

- The grid is presentational: it does not fetch data. Wire it in the shell page
  to the container-widgets read hook (react-adapter) which supplies the shaped
  `containers` array, `isLoading`, and any `errorMessage`.
- Empty and error states render an `EmptyState`; the first load renders a
  `Spinner`
