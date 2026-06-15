# DataTable

Sortable, paginated, optionally selectable / expandable table built on
TanStack React Table. Controlled and uncontrolled modes for each piece of
state.

## Props (subset)

| Prop                   | Type                                      | Required | Default | Description                              |
| ---------------------- | ----------------------------------------- | -------- | ------- | ---------------------------------------- |
| `data`                 | `I[]`                                     | yes      | —       | Rows.                                    |
| `columns`              | `DataTableColumnDef<I>[]`                 | yes      | —       | TanStack column defs.                    |
| `fullWidth`            | `boolean`                                 | no       | `true`  | Stretch to container width.              |
| `enableRowSelection`   | `boolean \| ((row) => boolean)`           | no       | `false` | Checkbox column.                         |
| `enableMultiRowSelection` | `boolean`                              | no       | `true`  | Allow multi-select.                      |
| `selections`           | `DataTableRowSelectionState`              | no       | —       | Controlled row-selection state.          |
| `onSelectionsChange`   | `(s: DataTableRowSelectionState) => void` | no       | —       | Setter.                                  |
| `enablePagination`     | `boolean`                                 | no       | `true`  | Show pagination footer.                  |
| `pagination`           | `DataTablePaginationState`                | no       | —       | Controlled pagination.                   |
| `sorting`              | `DataTableSortingState`                   | no       | —       | Controlled sorting.                      |
| `bordered`             | `boolean`                                 | no       | `false` | Add cell borders.                        |
| `loading`              | `boolean`                                 | no       | `false` | Show loading overlay.                    |
| `enableRowExpansion`   | `boolean`                                 | no       | `false` | Show row expansion column.               |
| `renderExpandedContent`| `(row) => ReactNode`                      | no       | —       | Required when row expansion is enabled.  |
| `getRowId`             | `(row, index, parent?) => string`         | no       | index   | Stable row ID source.                    |

See `data-table.tsx` for the full list (16 props).

### Column `meta`

| Field   | Applied by `DataTable` | Description                          |
| ------- | ---------------------- | ------------------------------------ |
| `align` | yes                    | `left` \| `center` \| `right` on cells |

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
