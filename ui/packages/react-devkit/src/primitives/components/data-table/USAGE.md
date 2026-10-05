# `DataTable`

Sortable, paginated, optionally selectable / expandable table built on
TanStack React Table. Controlled and uncontrolled modes for each piece of
state.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `columns` | Required | `ColumnDef<I, any>[]` | - | The column configuration table. See https://tanstack.com/table/v8/docs/guide/column-defs |
| `data` | Required | `I[]` | - | The data to be shown in the table. See https://tanstack.com/table/v8/docs/guide/data |
| `bordered` | Optional | `boolean` | `false` | Add borders to all cells |
| `canRowExpand` | Optional | `((row: Row<I>) => boolean)` | `false` | Callback to check if a row can be expanded |
| `contentClassName` | Optional | `string` | - | Classname of the content element |
| `defaultSorting` | Optional | `SortingState` | `[]` | Default sorting applied when the table is first mounted (uncontrolled mode). Ignored when `sorting` is provided |
| `enableMultiRowSelection` | Optional | `boolean` | `true` | Enables selection of multiple rows |
| `enablePagination` | Optional | `boolean` | `true` | Show pagination |
| `enableRowExpansion` | Optional | `boolean` | `false` | Show a columns with a button which can expand the row |
| `enableRowSelection` | Optional | `boolean \| ((row: Row<I>) => boolean)` | `false` | Show a checkbox column and enables selection |
| `expandedRows` | Optional | `ExpandedState` | - | Specify the expanded rows If `undefined`, the expansions are managed internally Object with the key of row ID and a boolean specifying if the row is selected. The default row ID is the index. This can be changed using `getRowId` prop |
| `fullWidth` | Optional | `boolean` | `true` | Is table full width |
| `getRowId` | Optional | `((row: I, index: number, parent?: Row<I> \| undefined) => string)` | `index` | Get the row ID for a row. If not specified index is the default row ID |
| `loading` | Optional | `boolean` | `false` | Show a loading indicator overlay |
| `onExpandedRowsChange` | Optional | `((expandedRows: ExpandedState) => void)` | - | Callback to be called when the rows are expanded or collapsed |
| `onPaginationChange` | Optional | `((pagination: PaginationState) => void)` | - | Callback to be called when the pagination params change |
| `onRowClick` | Optional | `((rowData: I) => void)` | - | Called when a body row is clicked. When set, rows become interactive (pointer cursor, `role="button"`, keyboard-activatable with Enter/Space). Clicks originating from an interactive control in the row (button, link, input, checkbox, or anything marked `data-no-row-click`) are ignored, so the selection checkbox and expand toggle keep working independently |
| `onSelectionsChange` | Optional | `((selections: RowSelectionState) => void)` | - | Callback to be called when the row are selected / unselected |
| `onSortingChange` | Optional | `((sorting: SortingState) => void)` | - | Callback to be called when the sorting changes |
| `pagination` | Optional | `PaginationState` | `undefined` | Specify the pagination params. Object of shape { pageIndex: number, pageSize: number }. If `undefined` then the pagination is managed internally |
| `renderExpandedContent` | Optional | `((row: Row<I>) => React.ReactNode)` | - | Render the content of the expanded row. Required when `enableRowExpansion` is `true` |
| `selections` | Optional | `RowSelectionState` | `undefined` | Specify the selected rows. If `undefined`, the selections are managed internally Object with the key of row ID and a boolean specifying if the row is selected. The default row ID is the index. This can be changed using `getRowId` prop |
| `sorting` | Optional | `SortingState` | `undefined` | Specify the sorting params. If `undefined` then the sorting is managed internally |
| `tableClassName` | Optional | `string` | - | Classname of the table element |
| `wrapperClassName` | Optional | `string` | - | Classname of the wrapper element |
<!-- END GENERATED: props -->

## Props detail

A subset of the full prop surface.


> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Prop                      | Status   | Type                                      | Default | Description                             |
| ------------------------- | -------- | ----------------------------------------- | ------- | --------------------------------------- |
| `data`                    | Required | `I[]`                                     | —       | Rows                                    |
| `columns`                 | Required | `DataTableColumnDef<I>[]`                 | —       | TanStack column defs                    |
| `fullWidth`               | Optional | `boolean`                                 | `true`  | Stretch to container width              |
| `enableRowSelection`      | Optional | `boolean \| ((row) => boolean)`           | `false` | Checkbox column                         |
| `enableMultiRowSelection` | Optional | `boolean`                                 | `true`  | Allow multi-select                      |
| `selections`              | Optional | `DataTableRowSelectionState`              | —       | Controlled row-selection state          |
| `onSelectionsChange`      | Optional | `(s: DataTableRowSelectionState) => void` | —       | Setter                                  |
| `enablePagination`        | Optional | `boolean`                                 | `true`  | Show pagination footer                  |
| `pagination`              | Optional | `DataTablePaginationState`                | —       | Controlled pagination                   |
| `sorting`                 | Optional | `DataTableSortingState`                   | —       | Controlled sorting                      |
| `bordered`                | Optional | `boolean`                                 | `false` | Add cell borders                        |
| `loading`                 | Optional | `boolean`                                 | `false` | Show loading overlay                    |
| `enableRowExpansion`      | Optional | `boolean`                                 | `false` | Show row expansion column               |
| `renderExpandedContent`   | Optional | `(row) => ReactNode`                      | —       | Required when row expansion is enabled  |
| `getRowId`                | Optional | `(row, index, parent?) => string`         | index   | Stable row ID source                    |
| `onRowClick`              | Optional | `(rowData: I) => void`                    | —       | Makes rows interactive (see note below) |

See [`data-table.tsx`](./data-table.tsx) for the full list (16 props).

> [!NOTE]
> Setting `onRowClick` makes every body row `role="button"`, focusable, and keyboard-activatable
> (Enter/Space). Clicks starting inside a `button`, `a`, `input`, `label`, `[role="checkbox"]`, or
> anything marked `data-no-row-click` are ignored, so the selection checkbox and expand toggle keep
> working independently of the row click.

### Column `meta`

| Field   | Applied by `DataTable` | Description                            |
| ------- | ---------------------- | -------------------------------------- |
| `align` | Yes                    | `left` \| `center` \| `right` on cells |

## Example

```tsx
<DataTable<Miner>
  data={data}
  columns={columns}
  getRowId={(row) => row.id}
  enablePagination
/>
```

## Data contracts

`DataTableColumnDef`, `DataTableRow`, `DataTableSortingState`,
`DataTablePaginationState`, `DataTableRowSelectionState`, `DataTableExpandedState`
are re-exported from `@tetherto/mdk-react-devkit`.
