# Sidebar

Application sidebar with collapsible state (persisted via `localStorage`),
optional overlay mode, and item-click + active-item highlighting.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `items` | Required | `SidebarMenuItem[]` | - | Menu items (supports nested `items`) |
| `activeId` | Optional | `string` | - | Currently active item id |
| `className` | Optional | `string` | - | Additional class names |
| `defaultExpanded` | Optional | `boolean` | `false` | Initial expanded state |
| `expanded` | Optional | `boolean` | - | Controlled expanded state |
| `header` | Optional | `React.ReactNode` | - | Header content (e.g. logo, app name) |
| `onClose` | Optional | `VoidFunction` | - | Called when the backdrop or ESC closes |
| `onExpandedChange` | Optional | `((expanded: boolean) => void)` | - | Setter for the expanded state |
| `onItemClick` | Optional | `((item: SidebarMenuItem) => void)` | - | Item-click handler |
| `overlay` | Optional | `boolean` | `false` | Show as fixed overlay with backdrop |
| `visible` | Optional | `boolean` | `true` | Hide entirely without unmounting |
<!-- END GENERATED: props -->

## Example

```tsx
<Sidebar
  items={[
    { id: "/dashboard", label: "Dashboard" },
    { id: "/alerts", label: "Alerts" },
  ]}
  activeId={location.pathname}
  onItemClick={({ id }) => navigate(id)}
/>
```

## Data contracts

```ts
type SidebarMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  items?: SidebarMenuItem[];
};
```
