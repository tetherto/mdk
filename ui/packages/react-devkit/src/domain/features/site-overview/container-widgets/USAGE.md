# ContainerWidgets

Site Overview → Container Widgets: the read-only grid of per-container summary
cards. Purely presentational — the shell page feeds it the shaped `containers`
array (from the container-widgets data hook) and handles navigation via
`onContainerClick`.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `containers` | `ContainerWidgetItem[]` | yes | — | Card-ready data per container (`ContainerWidgetCardProps` + `id`) |
| `title` | `string` | no | `"Containers"` | Section heading |
| `isLoading` | `boolean` | no | `false` | Show a spinner during the first load |
| `errorMessage` | `string` | no | — | Error message shown in place of the grid |
| `onContainerClick` | `(id: string) => void` | no | — | Invoked with the container id on card click |
| `className` | `string` | no | — | Additional class for the root element |

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
  `Spinner`.
