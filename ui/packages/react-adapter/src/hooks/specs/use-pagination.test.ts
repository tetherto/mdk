import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PaginationArgs } from '../use-pagination'
import { usePagination } from '../use-pagination'

describe('usePagination', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePagination())

      expect(result.current.pagination).toEqual({
        current: 1,
        pageSize: 20,
        showSizeChanger: true,
        total: 21, // pageSize + 1
      })

      expect(result.current.queryArgs).toEqual({
        limit: 20,
        offset: 0,
      })
    })

    it('should initialize with custom current page', () => {
      const { result } = renderHook(() => usePagination({ current: 3 }))

      expect(result.current.pagination.current).toBe(3)
      expect(result.current.queryArgs.offset).toBe(40) // (3 - 1) * 20
    })

    it('should initialize with custom page size', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 50 }))

      expect(result.current.pagination.pageSize).toBe(50)
      expect(result.current.pagination.total).toBe(51) // pageSize + 1
      expect(result.current.queryArgs.limit).toBe(50)
    })

    it('should initialize with custom total', () => {
      const { result } = renderHook(() => usePagination({ total: 100 }))

      expect(result.current.pagination.total).toBe(100)
    })

    it('should initialize with showSizeChanger disabled', () => {
      const { result } = renderHook(() => usePagination({ showSizeChanger: false }))

      expect(result.current.pagination.showSizeChanger).toBe(false)
    })

    it('should initialize with all custom values', () => {
      const args: PaginationArgs = {
        current: 2,
        pageSize: 10,
        total: 200,
        showSizeChanger: false,
      }

      const { result } = renderHook(() => usePagination(args))

      expect(result.current.pagination).toEqual({
        current: 2,
        pageSize: 10,
        showSizeChanger: false,
        total: 200,
      })

      expect(result.current.queryArgs).toEqual({
        limit: 10,
        offset: 10, // (2 - 1) * 10
      })
    })
  })

  describe('handleChange', () => {
    it('should update current page', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.handleChange(3, 20)
      })

      expect(result.current.pagination.current).toBe(3)
      expect(result.current.queryArgs.offset).toBe(40)
    })

    it('should update page size', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.handleChange(1, 50)
      })

      expect(result.current.pagination.pageSize).toBe(50)
      expect(result.current.queryArgs.limit).toBe(50)
    })

    it('should update both page and page size', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.handleChange(4, 25)
      })

      expect(result.current.pagination.current).toBe(4)
      expect(result.current.pagination.pageSize).toBe(25)
      expect(result.current.queryArgs).toEqual({
        limit: 25,
        offset: 75, // (4 - 1) * 25
      })
    })

    it('should maintain other state values when changing page', () => {
      const { result } = renderHook(() => usePagination({ total: 100, showSizeChanger: false }))

      act(() => {
        result.current.handleChange(2, 20)
      })

      expect(result.current.pagination.total).toBe(100)
      expect(result.current.pagination.showSizeChanger).toBe(false)
    })
  })

  describe('setPagination', () => {
    it('should allow manual state updates', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setPagination((prev) => ({
          ...prev,
          current: 5,
          total: 500,
        }))
      })

      expect(result.current.pagination.current).toBe(5)
      expect(result.current.pagination.total).toBe(500)
    })

    it('should allow full state replacement', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setPagination({
          current: 10,
          pageSize: 100,
          total: 1000,
          showSizeChanger: false,
        })
      })

      expect(result.current.pagination).toEqual({
        current: 10,
        pageSize: 100,
        total: 1000,
        showSizeChanger: false,
      })
    })
  })

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => usePagination({ current: 1, pageSize: 20 }))

      // Change state
      act(() => {
        result.current.handleChange(5, 50)
      })

      expect(result.current.pagination.current).toBe(5)
      expect(result.current.pagination.pageSize).toBe(50)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.pagination).toEqual({
        current: 1,
        pageSize: 20,
        showSizeChanger: true,
        total: 21,
      })
    })

    it('should reset to custom initial state', () => {
      const { result } = renderHook(() => usePagination({ current: 3, pageSize: 10, total: 200 }))

      // Change state
      act(() => {
        result.current.handleChange(8, 25)
      })

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.pagination).toEqual({
        current: 3,
        pageSize: 10,
        showSizeChanger: true,
        total: 200,
      })
    })
  })

  describe('setTotal', () => {
    it('should update total count', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setTotal(500)
      })

      expect(result.current.pagination.total).toBe(500)
    })

    it('should not affect other state values', () => {
      const { result } = renderHook(() => usePagination({ current: 2, pageSize: 30 }))

      act(() => {
        result.current.setTotal(300)
      })

      expect(result.current.pagination).toEqual({
        current: 2,
        pageSize: 30,
        showSizeChanger: true,
        total: 300,
      })
    })

    it('should handle zero total', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.setTotal(0)
      })

      expect(result.current.pagination.total).toBe(0)
    })
  })

  describe('hideNextPage', () => {
    it('should hide next page when no current page size provided', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      act(() => {
        result.current.handleChange(3, 20)
      })

      act(() => {
        result.current.hideNextPage()
      })

      expect(result.current.pagination.total).toBe(60) // pageSize * current
    })

    it('should show next page when current page is full', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      act(() => {
        result.current.handleChange(3, 20)
      })

      act(() => {
        result.current.hideNextPage(20) // Full page
      })

      expect(result.current.pagination.total).toBe(61) // pageSize * current + 1
    })

    it('should hide next page when current page is not full', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      act(() => {
        result.current.handleChange(3, 20)
      })

      act(() => {
        result.current.hideNextPage(15) // Not full (15 < 20)
      })

      expect(result.current.pagination.total).toBe(60) // pageSize * current, no +1
    })

    it('should handle edge case with zero items on current page', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      act(() => {
        result.current.handleChange(2, 20)
      })

      act(() => {
        result.current.hideNextPage(0)
      })

      expect(result.current.pagination.total).toBe(40) // No next page
    })

    it('should handle first page with partial data', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      act(() => {
        result.current.hideNextPage(10) // Only 10 items on first page
      })

      expect(result.current.pagination.total).toBe(20) // current is 1, so 20 * 1
    })
  })

  describe('queryArgs calculation', () => {
    it('should calculate correct offset for page 1', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 10 }))

      expect(result.current.queryArgs).toEqual({
        limit: 10,
        offset: 0,
      })
    })

    it('should calculate correct offset for page 2', () => {
      const { result } = renderHook(() => usePagination({ current: 2, pageSize: 10 }))

      expect(result.current.queryArgs).toEqual({
        limit: 10,
        offset: 10,
      })
    })

    it('should calculate correct offset for page 5 with pageSize 25', () => {
      const { result } = renderHook(() => usePagination({ current: 5, pageSize: 25 }))

      expect(result.current.queryArgs).toEqual({
        limit: 25,
        offset: 100, // (5 - 1) * 25
      })
    })

    it('should update queryArgs when page changes', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 15 }))

      act(() => {
        result.current.handleChange(3, 15)
      })

      expect(result.current.queryArgs).toEqual({
        limit: 15,
        offset: 30, // (3 - 1) * 15
      })
    })

    it('should update queryArgs when pageSize changes', () => {
      const { result } = renderHook(() => usePagination({ current: 2, pageSize: 10 }))

      act(() => {
        result.current.handleChange(2, 20)
      })

      expect(result.current.queryArgs).toEqual({
        limit: 20,
        offset: 20, // (2 - 1) * 20
      })
    })
  })

  describe('real-world scenarios', () => {
    it('should handle pagination flow: load page, then load next', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 10, total: 100 }))

      // Initial state - page 1
      expect(result.current.pagination.current).toBe(1)
      expect(result.current.queryArgs.offset).toBe(0)

      // Navigate to page 2
      act(() => {
        result.current.handleChange(2, 10)
      })

      expect(result.current.pagination.current).toBe(2)
      expect(result.current.queryArgs.offset).toBe(10)

      // Navigate to page 3
      act(() => {
        result.current.handleChange(3, 10)
      })

      expect(result.current.pagination.current).toBe(3)
      expect(result.current.queryArgs.offset).toBe(20)
    })

    it('should handle changing page size mid-pagination', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20, total: 200 }))

      // Go to page 3 (items 41-60)
      act(() => {
        result.current.handleChange(3, 20)
      })

      expect(result.current.queryArgs.offset).toBe(40)

      // Change page size to 50 (should stay on page 3, now items 101-150)
      act(() => {
        result.current.handleChange(3, 50)
      })

      expect(result.current.pagination.pageSize).toBe(50)
      expect(result.current.queryArgs.offset).toBe(100) // (3 - 1) * 50
    })

    it('should handle API response with unknown total (infinite scroll)', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      // Initial load - got 20 items
      act(() => {
        result.current.hideNextPage(20)
      })

      expect(result.current.pagination.total).toBe(21) // Show next page

      // Load page 2 - got 20 items
      act(() => {
        result.current.handleChange(2, 20)
      })

      act(() => {
        result.current.hideNextPage(20)
      })

      expect(result.current.pagination.total).toBe(41) // Show next page

      // Load page 3 - got only 15 items (last page)
      act(() => {
        result.current.handleChange(3, 20)
      })

      act(() => {
        result.current.hideNextPage(15)
      })

      expect(result.current.pagination.total).toBe(60) // Hide next page (15 < 20)
    })

    it('should handle API response with known total', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 20 }))

      // API returns total count
      act(() => {
        result.current.setTotal(247)
      })

      expect(result.current.pagination.total).toBe(247)

      // Navigate through pages
      act(() => {
        result.current.handleChange(5, 20)
      })

      expect(result.current.queryArgs).toEqual({
        limit: 20,
        offset: 80, // (5 - 1) * 20
      })
    })

    it('should handle user resetting and starting over', () => {
      const { result } = renderHook(() => usePagination({ current: 1, pageSize: 10, total: 100 }))

      // Navigate to page 5
      act(() => {
        result.current.handleChange(5, 10)
      })

      // Change page size
      act(() => {
        result.current.handleChange(5, 25)
      })

      expect(result.current.pagination.current).toBe(5)
      expect(result.current.pagination.pageSize).toBe(25)

      // Reset everything
      act(() => {
        result.current.reset()
      })

      expect(result.current.pagination).toEqual({
        current: 1,
        pageSize: 10,
        showSizeChanger: true,
        total: 100,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle negative page numbers gracefully', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.handleChange(-1, 20)
      })

      expect(result.current.pagination.current).toBe(-1)
      expect(result.current.queryArgs.offset).toBe(-40) // Edge case, component should validate
    })

    it('should handle very large page numbers', () => {
      const { result } = renderHook(() => usePagination())

      act(() => {
        result.current.handleChange(1000000, 20)
      })

      expect(result.current.pagination.current).toBe(1000000)
      expect(result.current.queryArgs.offset).toBe(19999980)
    })

    it('should handle page size of 1', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 1 }))

      expect(result.current.queryArgs.limit).toBe(1)

      act(() => {
        result.current.handleChange(10, 1)
      })

      expect(result.current.queryArgs.offset).toBe(9)
    })

    it('should handle very large page sizes', () => {
      const { result } = renderHook(() => usePagination({ pageSize: 10000 }))

      expect(result.current.queryArgs.limit).toBe(10000)
      expect(result.current.pagination.total).toBe(10001)
    })
  })
})
