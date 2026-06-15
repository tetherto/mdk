import { cn } from '../../utils'

type ColumnAlign = 'left' | 'center' | 'right'

export const getTableCellAlignClassName = (align?: ColumnAlign): string | undefined =>
  cn({
    'mdk-table__cell--align-center': align === 'center',
    'mdk-table__cell--align-right': align === 'right',
  }) || undefined
