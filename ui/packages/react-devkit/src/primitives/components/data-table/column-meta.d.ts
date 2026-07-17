import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // Module augmentation must stay an interface for declaration merging.
  // eslint-disable-next-line ts/consistent-type-definitions -- TanStack Table merges ColumnMeta
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
  }
}
