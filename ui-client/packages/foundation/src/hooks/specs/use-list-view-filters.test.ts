import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useListViewFilters } from '../use-list-view-filters'

vi.mock('../utils/list-view-utils', () => ({
  getFilterOptionsByTab: vi.fn((tab: string) => {
    if (tab === 'miner') {
      return [
        { label: 'Type', value: 'type', tab: ['miner'], order: 1, children: [] },
        {
          label: 'Status',
          value: 'last.snap.stats.status',
          tab: ['miner'],
          order: 2,
          children: [],
        },
        {
          label: 'Power mode',
          value: 'last.snap.config.power_mode',
          tab: ['miner'],
          order: 4,
          children: [],
        },
      ]
    }
    if (tab === 'container') {
      return [
        { label: 'Type', value: 'type', tab: ['container'], order: 1, children: [] },
        {
          label: 'Status',
          value: 'last.snap.stats.status',
          tab: ['container'],
          order: 2,
          children: [],
        },
        {
          label: 'Container Alarm',
          value: 'last.snap.stats.alarm_status',
          tab: ['container'],
          order: 3,
          children: [],
        },
      ]
    }
    return []
  }),
}))

const TYPE_FILTER_CHILDREN = [
  { label: 'Antminer S19XP', value: 'miner-am-s19xp' },
  { label: 'Whatsminer M30SP', value: 'miner-wm-m30sp' },
]

const SITE_TYPE_FILTERS = [
  {
    value: 'miner',
    label: 'Miner',
    children: TYPE_FILTER_CHILDREN,
  },
]

const DEFAULT_PARAMS = {
  site: 'my-site',
  selectedType: 'miner',
  availableDevices: {
    availableContainerTypes: [],
    availableMinerTypes: ['miner-am-s19xp'],
  },
  typeFiltersForSite: SITE_TYPE_FILTERS,
}

describe('useListViewFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('filters is undefined initially', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      expect(result.current.filters).toBeUndefined()
    })

    it('previousFilters is undefined initially', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      expect(result.current.previousFilters).toBeUndefined()
    })

    it('returns onFiltersChange as a function', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      expect(typeof result.current.onFiltersChange).toBe('function')
    })

    it('returns setFilters as a function', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      expect(typeof result.current.setFilters).toBe('function')
    })

    it('returns setPreviousFilters as a function', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      expect(typeof result.current.setPreviousFilters).toBe('function')
    })
  })

  describe('listViewFilterOptions', () => {
    it('returns filter options when site is provided', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      expect(result.current.listViewFilterOptions.length).toBeGreaterThan(0)
    })

    it('returns empty array when site is undefined', () => {
      const { result } = renderHook(() =>
        useListViewFilters({ ...DEFAULT_PARAMS, site: undefined }),
      )
      expect(result.current.listViewFilterOptions).toEqual([])
    })

    it('returns empty array when site is empty string', () => {
      const { result } = renderHook(() => useListViewFilters({ ...DEFAULT_PARAMS, site: '' }))
      expect(result.current.listViewFilterOptions).toEqual([])
    })

    it('options are sorted by order ascending', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      const orders = result.current.listViewFilterOptions
        .map((o) => o.order ?? 0)
        .filter((o) => o > 0)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    })

    it('replaces type option children with siteTypeFilter children', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      const typeOption = result.current.listViewFilterOptions.find((o) => o.value === 'type')
      expect(typeOption?.children).toEqual(TYPE_FILTER_CHILDREN)
    })

    it('non-type options are passed through unchanged', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      const statusOption = result.current.listViewFilterOptions.find(
        (o) => o.value === 'last.snap.stats.status',
      )
      expect(statusOption).toBeDefined()
      expect(statusOption?.value).toBe('last.snap.stats.status')
    })

    it('type option children are undefined when no matching siteTypeFilter found', () => {
      const { result } = renderHook(() =>
        useListViewFilters({
          ...DEFAULT_PARAMS,
          selectedType: 'cabinet',
          typeFiltersForSite: [],
        }),
      )
      const typeOption = result.current.listViewFilterOptions.find((o) => o.value === 'type')
      expect(typeOption?.children).toBeUndefined()
    })
  })

  describe('selectedType change', () => {
    it('resets filters to undefined when selectedType changes', () => {
      const { result, rerender } = renderHook((params) => useListViewFilters(params), {
        initialProps: DEFAULT_PARAMS,
      })

      act(() => {
        result.current.onFiltersChange([['last.snap.stats.status', 'mining']])
      })

      expect(result.current.filters).toBeDefined()

      rerender({ ...DEFAULT_PARAMS, selectedType: 'container' })

      expect(result.current.filters).toBeUndefined()
    })

    it('resets previousFilters to undefined when selectedType changes', () => {
      const { result, rerender } = renderHook((params) => useListViewFilters(params), {
        initialProps: DEFAULT_PARAMS,
      })

      act(() => {
        result.current.onFiltersChange([['last.snap.stats.status', 'mining']])
      })

      rerender({ ...DEFAULT_PARAMS, selectedType: 'container' })

      expect(result.current.previousFilters).toBeUndefined()
    })
  })

  describe('onFiltersChange', () => {
    it('groups selections by key', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([
          ['last.snap.stats.status', 'mining'],
          ['last.snap.stats.status', 'offline'],
        ])
      })

      expect(result.current.filters?.['last.snap.stats.status']).toEqual(['mining', 'offline'])
    })

    it('uses childValue when provided as third tuple element', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([['type', 'miner', 'miner-am-s19xp']])
      })

      expect(result.current.filters?.type).toEqual(['miner-am-s19xp'])
    })

    it('uses value when childValue is not provided', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([['last.snap.stats.status', 'mining']])
      })

      expect(result.current.filters?.['last.snap.stats.status']).toEqual(['mining'])
    })

    it('groups multiple different keys correctly', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([
          ['last.snap.stats.status', 'mining'],
          ['last.snap.config.power_mode', 'high'],
        ])
      })

      expect(result.current.filters?.['last.snap.stats.status']).toEqual(['mining'])
      expect(result.current.filters?.['last.snap.config.power_mode']).toEqual(['high'])
    })

    it('sets previousFilters to value before the update', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([['last.snap.stats.status', 'mining']])
      })

      const firstFilters = result.current.filters

      act(() => {
        result.current.onFiltersChange([['last.snap.stats.status', 'offline']])
      })

      expect(result.current.previousFilters).toEqual(firstFilters)
    })

    it('sets filters to empty object when called with empty selections', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([])
      })

      expect(result.current.filters).toEqual({})
    })

    it('is stable across re-renders (referential equality)', () => {
      const { result, rerender } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))
      const first = result.current.onFiltersChange
      rerender()
      expect(result.current.onFiltersChange).toBe(first)
    })
  })

  describe('last.alerts special handling', () => {
    it('keeps last.alerts when exactly 1 alert is selected', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([['last.alerts', 'alert-1']])
      })

      expect(result.current.filters?.['last.alerts']).toEqual(['alert-1'])
    })

    it('removes last.alerts when 0 alerts are selected', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([])
      })

      expect(result.current.filters?.['last.alerts']).toBeUndefined()
    })

    it('removes last.alerts when more than 1 alert is selected', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([
          ['last.alerts', 'alert-1'],
          ['last.alerts', 'alert-2'],
        ])
      })

      expect(result.current.filters?.['last.alerts']).toBeUndefined()
    })

    it('preserves other filters when removing last.alerts', () => {
      const { result } = renderHook(() => useListViewFilters(DEFAULT_PARAMS))

      act(() => {
        result.current.onFiltersChange([
          ['last.snap.stats.status', 'mining'],
          ['last.alerts', 'alert-1'],
          ['last.alerts', 'alert-2'],
        ])
      })

      expect(result.current.filters?.['last.snap.stats.status']).toEqual(['mining'])
      expect(result.current.filters?.['last.alerts']).toBeUndefined()
    })
  })
})
