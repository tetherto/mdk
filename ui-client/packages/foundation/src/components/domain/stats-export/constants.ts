export const EXPORT_LABEL = 'Export' as const
export const EXPORT_ITEM_KEYS = {
  CSV: 'csv',
  JSON: 'json',
} as const
export const EXPORT_ITEMS = [
  {
    label: 'Export as CSV',
    key: EXPORT_ITEM_KEYS.CSV,
  },
  {
    label: 'Export as JSON',
    key: EXPORT_ITEM_KEYS.JSON,
  },
] as const
