# Sidebar

Application sidebar with collapsible state (persisted via `localStorage`),
optional overlay mode, and item-click + active-item highlighting.

## Props

| Prop                | Type                              | Required | Default | Description                              |
| ------------------- | --------------------------------- | -------- | ------- | ---------------------------------------- |
| `items`             | `SidebarMenuItem[]`               | yes      | —       | Menu items (supports nested `items`).    |
| `activeId`          | `string`                          | no       | —       | Currently active item id.                |
| `onItemClick`       | `(item: SidebarMenuItem) => void` | no       | —       | Item-click handler.                      |
| `expanded`          | `boolean`                         | no       | —       | Controlled expanded state.               |
| `onExpandedChange`  | `(expanded: boolean) => void`     | no       | —       | Setter for the expanded state.           |
| `defaultExpanded`   | `boolean`                         | no       | `false` | Initial expanded state.                  |
| `visible`           | `boolean`                         | no       | `true`  | Hide entirely without unmounting.        |
| `overlay`           | `boolean`                         | no       | `false` | Show as fixed overlay with backdrop.     |
| `onClose`           | `VoidFunction`                    | no       | —       | Called when the backdrop or ESC closes.  |
| `header`            | `ReactNode`                       | no       | —       | Header content (e.g. logo, app name).    |
| `className`         | `string`                          | no       | —       | Additional class names.                  |

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
