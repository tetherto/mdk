# `ContainerDetail`

Container detail page shell: a back link, the container name, and a per-model
tab strip. Purely presentational — the page resolves the tab list (via the
foundation tab matrix `getSupportedContainerTabs`), owns the active tab and
routing, and supplies the active tab's body as `children`. This is the frame
every container detail tab mounts into.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `activeTab` | Required | `string` | - | Currently active tab key |
| `onBack` | Required | `() => void` | - | Fired when the back link is clicked (the page decides where to go) |
| `onTabChange` | Required | `(tab: string) => void` | - | Fired with the next tab key when the operator switches tabs |
| `tabs` | Required | `ContainerDetailTab[]` | - | Ordered tabs for this container model (already resolved by the page) |
| `backLabel` | Optional | `React.ReactNode` | `"Explorer"` | Back-link label. Defaults to "Explorer" |
| `children` | Optional | `React.ReactNode` | - | The active tab's body — supplied by the page (real content or a placeholder) |
| `className` | Optional | `string` | - | Additional class for the root element |
| `name` | Optional | `React.ReactNode` | - | Container display name shown in the header. Optional — omit it when the host already renders the container name as the page title (e.g. the shell's `PageLayout`), so the name is not shown twice |
<!-- END GENERATED: props -->

## Example

```tsx
import {
  ContainerDetail,
  ContainerDetailPlaceholder,
  useThingDetail,
} from "@tetherto/mdk-react-devkit"
import { CONTAINER_TAB_LABEL, getSupportedContainerTabs } from "@tetherto/mdk-ui-foundation"

const { thing } = useThingDetail(id)
const tabs = getSupportedContainerTabs(thing?.type).map((key) => ({
  key,
  label: CONTAINER_TAB_LABEL[key],
}))

<ContainerDetail
  name={thing?.name ?? id}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={(next) => navigate(detailPath(id, next, backUrl))}
  onBack={() => navigate(backUrl ?? "/explorer")}
>
  <ContainerDetailPlaceholder label={activeLabel} />
</ContainerDetail>
```

## Notes

- The shell does not fetch data or own routing — the page resolves the tab
  list from the foundation tab matrix, reads `:id` / `:tab` / `backUrl` from the
  URL, and passes navigation callbacks in
- Tab bodies are supplied as `children`; use `<ContainerDetailPlaceholder>` for
  tabs whose real content has not been built yet
- When `tabs` is empty (an unknown / unsupported container type) the shell
  renders an empty state instead of the tab strip
