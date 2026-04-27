import { useCallback, useState } from 'react'

export type PaginationArgs = {
  /**
   * Initial current page
   * @default 1
   */
  current?: number
  /**
   * Initial page size
   * @default 20
   */
  pageSize?: number
  /**
   * Initial total count (optional)
   */
  total?: number
  /**
   * Show size changer
   * @default true
   */
  showSizeChanger?: boolean
}

export type PaginationState = {
  current: number
  pageSize: number
  showSizeChanger: boolean
  total: number
}

export type UsePaginationReturn = {
  /**
   * Current pagination state
   */
  pagination: PaginationState
  /**
   * Query arguments for API calls (limit/offset pattern)
   */
  queryArgs: {
    limit: number
    offset: number
  }
  /**
   * Update pagination state
   */
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
  /**
   * Handle page or page size change
   */
  handleChange: (page: number, pageSize: number) => void
  /**
   * Reset pagination to initial state
   */
  reset: VoidFunction
  /**
   * Set total count (useful for hiding next page when data is exhausted)
   */
  setTotal: (total: number) => void
  /**
   * Hide next page if current page data is less than pageSize
   */
  hideNextPage: (currentPageSize?: number) => void
}

/**
 * Custom hook for managing pagination state
 *
 * @example
 * ```tsx
 * const { pagination, queryArgs, handleChange } = usePagination({
 *   current: 1,
 *   pageSize: 20
 * })
 *
 * // Use in API call
 * const { data } = useQuery(['items', queryArgs], () =>
 *   api.getItems(queryArgs.limit, queryArgs.offset)
 * )
 *
 * // Use with Pagination component
 * <Pagination {...pagination} onChange={handleChange} />
 * ```
 */
export const usePagination = (args: PaginationArgs = {}): UsePaginationReturn => {
  const {
    current: initialCurrent = 1,
    pageSize: initialPageSize = 20,
    total: initialTotal,
    showSizeChanger = true,
  } = args

  const initialState: PaginationState = {
    current: initialCurrent,
    pageSize: initialPageSize,
    showSizeChanger,
    total: initialTotal ?? initialPageSize + 1, // Show at least one more page initially
  }

  const [pagination, setPagination] = useState<PaginationState>(initialState)

  const handleChange = useCallback((page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }))
  }, [])

  const reset = useCallback(() => {
    setPagination(initialState)
  }, [initialState])

  const setTotal = useCallback((total: number) => {
    setPagination((prev) => ({
      ...prev,
      total,
    }))
  }, [])

  const hideNextPage = useCallback((currentPageSize?: number) => {
    setPagination((prev) => {
      const { pageSize, current } = prev
      const hasMorePages = currentPageSize !== undefined && currentPageSize >= pageSize
      return {
        ...prev,
        total: pageSize * current + (hasMorePages ? 1 : 0),
      }
    })
  }, [])

  return {
    pagination,
    queryArgs: {
      limit: pagination.pageSize,
      offset: (pagination.current - 1) * pagination.pageSize,
    },
    setPagination,
    handleChange,
    reset,
    setTotal,
    hideNextPage,
  }
}
