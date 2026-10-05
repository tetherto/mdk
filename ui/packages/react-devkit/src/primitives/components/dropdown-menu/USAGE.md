# `DropdownMenu`

A composable dropdown menu built on Radix UI `@radix-ui/react-dropdown-menu`. Provides both "interactive" Radix-based components (for keyboard-accessible menus) and "static" `div`-based variants (for controlled renders or non-Radix contexts).

## Exports

### Core primitives

| Name | Description |
| ---- | ----------- |
| `DropdownMenu` (`Root`) | Root compound component |
| `DropdownMenuTrigger` (`Trigger`) | Element that opens the menu |
| `DropdownMenuPortal` (`Portal`) | Radix portal |
| `DropdownMenuGroup` (`Group`) | Groups related items |
| `DropdownMenuContent` (`Content`) | Floating menu panel (Radix-managed) |
| `DropdownMenuStaticContent` (`StaticContent`) | `div`-based menu panel (always visible) |
| `DropdownMenuItem` (`Item`) | Interactive menu item (Radix-managed) |
| `DropdownMenuStaticItem` (`StaticItem`) | `div`-based menu item |
| `DropdownMenuCheckboxItem` (`CheckboxItem`) | Item with Radix checkbox state |
| `DropdownMenuStaticCheckboxItem` (`StaticCheckboxItem`) | `div`-based checkbox item |
| `DropdownMenuSeparator` (`Separator`) | Horizontal divider between items |
| `DropdownMenuLabel` (`Label`) | Non-interactive section label |
| `DropdownMenuSearch` (`Search`) | Search input inside the menu |
| `DropdownMenuEmpty` (`Empty`) | Empty-state message |
| `DropdownMenuSearchable` (`Searchable`) | Compound component combining `Search` + filtered `StaticItem` list |

### `DropdownMenuContent` Props detail

| Prop         | Status   | Type                   | Default | Description                                              |
| ------------ | -------- | ---------------------- | ------- | -------------------------------------------------------- |
| `size`       | Optional | `'sm' \| 'md' \| 'lg'` | `'md'`  | Controls item font/padding size (propagated via context) |
| `alignWidth` | Optional | `boolean`              | `false` | Stretches the menu panel to the trigger width            |
| `sideOffset` | Optional | `number`               | `4`     | Pixel gap between trigger and panel                      |

### `DropdownMenuItem` / `DropdownMenuStaticItem` Props detail

| Prop       | Status   | Type              | Default | Description                                     |
| ---------- | -------- | ----------------- | ------- | ----------------------------------------------- |
| `icon`     | Optional | `React.ReactNode` | —       | Icon prepended to the item content              |
| `disabled` | Optional | `boolean`         | —       | Disables the item                               |
| `active`   | Optional | `boolean`         | —       | Marks the item as active (static variants only) |

### `DropdownMenuSearchable` Props detail

| Prop           | Status   | Type             | Default    | Description                   |
| -------------- | -------- | ---------------- | ---------- | ----------------------------- |
| `items`        | Required | `{ label: string; icon?: React.ReactNode; disabled?: boolean; active?: boolean }[]` | —          | Items to search and render    |
| `placeholder`  | Optional | `string`         | `'Search'` | Input placeholder             |
| `emptyMessage` | Optional | `string`         | `'No matching results found'` | Shown when no items match     |
| `onItemSelect` | Optional | `(item) => void` | —          | Fired when an item is clicked |

## Example

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tetherto/mdk-react-devkit"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent size="md">
    <DropdownMenuItem onSelect={() => handleEdit()}>Edit</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => handleDuplicate()}>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => handleDelete()}>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Searchable variant
<DropdownMenuSearchable
  items={[
    { label: "Farm Alpha" },
    { label: "Farm Beta" },
    { label: "Farm Gamma" },
  ]}
  onItemSelect={(item) => navigate(item.label)}
/>
```

## Notes

- `size` is passed via React context from `DropdownMenuContent` to all child items; you do not need to set it on each item individually
- All named exports are also available as shorthand aliases (e.g. `Root`, `Item`, `Content`)
