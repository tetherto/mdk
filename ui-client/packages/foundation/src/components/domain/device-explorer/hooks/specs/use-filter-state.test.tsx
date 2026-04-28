import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useFilterState } from '../use-filter-state'
import type { LocalFilters } from '@tetherto/mdk-core-ui'

describe('useFilterState', () => {
  it('should initialize with empty filters', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: undefined,
        onFiltersChange,
      }),
    )

    expect(result.current.filters).toEqual({})
  })

  it('should use provided filters', () => {
    const onFiltersChange = vi.fn()
    const providedFilters: LocalFilters = { status: 'active', type: 'miner' }
    const { result } = renderHook(() =>
      useFilterState({
        filters: providedFilters,
        onFiltersChange,
      }),
    )

    expect(result.current.filters).toEqual(providedFilters)
  })

  it('should clear filters when empty selections provided', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: { status: 'active' },
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({})
  })

  it('should set single filter value', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([['status', 'active']])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ status: 'active' })
  })

  it('should convert same category to array', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([
        ['status', 'active'],
        ['status', 'offline'],
      ])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ status: ['active', 'offline'] })
  })

  it('should not duplicate values in array', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([
        ['status', 'active'],
        ['status', 'active'],
      ])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ status: 'active' })
  })

  it('should ignore selections with length < 2', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([['status'], ['type', 'miner']])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ type: 'miner' })
  })

  it('should ignore non-array selections', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange(['status' as any, ['type', 'miner']])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ type: 'miner' })
  })

  it('should get leaf value from nested selection', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([['category', 'subcategory', 'leafValue']])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ category: 'leafValue' })
  })

  it('should handle multiple categories', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([
        ['status', 'active'],
        ['type', 'miner'],
        ['location', 'datacenter-1'],
      ])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({
      status: 'active',
      type: 'miner',
      location: 'datacenter-1',
    })
  })

  it('should ignore selections with undefined value', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([
        ['status', undefined as any],
        ['type', 'miner'],
      ])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({ type: 'miner' })
  })

  it('should handle numeric and boolean filter values', () => {
    const onFiltersChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterState({
        filters: {},
        onFiltersChange,
      }),
    )

    act(() => {
      result.current.onFiltersChange([
        ['count', 5],
        ['enabled', true],
      ])
    })

    expect(onFiltersChange).toHaveBeenCalledWith({
      count: 5,
      enabled: true,
    })
  })
})
