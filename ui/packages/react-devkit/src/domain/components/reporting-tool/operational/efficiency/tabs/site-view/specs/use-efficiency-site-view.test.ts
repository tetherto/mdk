import { act, renderHook } from '@testing-library/react'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { describe, expect, it, vi } from 'vitest'

import type { MetricsEfficiencyLogEntry } from '../../../../../../../types'
import { SITE_VIEW_SERIES_LABELS } from '../../../efficiency.constants'
import { useEfficiencySiteView } from '../use-efficiency-site-view'

const makeLog = (count = 3): MetricsEfficiencyLogEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    ts: 1_700_000_000_000 + i * 86_400_000,
    efficiencyWThs: 20 + i,
  }))

describe('useEfficiencySiteView', () => {
  describe('legendData', () => {
    it('always includes the actual series', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      expect(result.current.legendData).toHaveLength(1)
      expect(result.current.legendData[0]?.label).toBe(SITE_VIEW_SERIES_LABELS.actual)
    })

    it('adds nominal series when nominalValue is provided', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: 22 }))
      expect(result.current.legendData).toHaveLength(2)
      expect(result.current.legendData[1]?.label).toBe(SITE_VIEW_SERIES_LABELS.nominal)
    })

    it('omits nominal series when nominalValue is null', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      expect(
        result.current.legendData.some((d) => d.label === SITE_VIEW_SERIES_LABELS.nominal),
      ).toBe(false)
    })

    it('marks actual as hidden after toggling index 0', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      act(() => result.current.handleToggleDataset(0))
      expect(result.current.legendData[0]?.hidden).toBe(true)
    })

    it('marks nominal as hidden after toggling index 1', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: 22 }))
      act(() => result.current.handleToggleDataset(1))
      expect(result.current.legendData[1]?.hidden).toBe(true)
    })

    it('restores visibility after toggling the same index twice', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      act(() => result.current.handleToggleDataset(0))
      act(() => result.current.handleToggleDataset(0))
      expect(result.current.legendData[0]?.hidden).toBe(false)
    })
  })

  describe('lineChartData', () => {
    it('maps log entries to {x: ts, y: efficiencyWThs} for the actual dataset', () => {
      const log = makeLog(2)
      const { result } = renderHook(() => useEfficiencySiteView({ log, nominalValue: null }))
      const actual = result.current.lineChartData.datasets[0]
      expect(actual?.data).toEqual([
        { x: log[0]!.ts, y: log[0]!.efficiencyWThs },
        { x: log[1]!.ts, y: log[1]!.efficiencyWThs },
      ])
    })

    it('produces a flat nominal line at nominalValue across all timestamps', () => {
      const log = makeLog(3)
      const { result } = renderHook(() => useEfficiencySiteView({ log, nominalValue: 21.5 }))
      const nominal = result.current.lineChartData.datasets[1]
      expect(nominal?.data.every((pt) => pt.y === 21.5)).toBe(true)
      expect(nominal?.data).toHaveLength(3)
    })

    it('omits nominal dataset when nominalValue is null', () => {
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: makeLog(), nominalValue: null }),
      )
      expect(result.current.lineChartData.datasets).toHaveLength(1)
    })

    it('sets actual dataset visible=false after toggle', () => {
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: makeLog(), nominalValue: null }),
      )
      act(() => result.current.handleToggleDataset(0))
      expect(result.current.lineChartData.datasets[0]?.visible).toBe(false)
    })

    it('sets nominal dataset visible=false after toggle', () => {
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: makeLog(), nominalValue: 22 }),
      )
      act(() => result.current.handleToggleDataset(1))
      expect(result.current.lineChartData.datasets[1]?.visible).toBe(false)
    })
  })

  describe('handleRangeSelect', () => {
    it('calls onDateRangeChange with start-of-day from and end-of-day to', () => {
      const onDateRangeChange = vi.fn()
      const from = new Date('2026-01-08T14:30:00')
      const to = new Date('2026-01-14T09:00:00')
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: [], nominalValue: null, onDateRangeChange }),
      )
      act(() => result.current.handleRangeSelect({ from, to }))
      expect(onDateRangeChange).toHaveBeenCalledWith({
        start: startOfDay(from).getTime(),
        end: endOfDay(to).getTime(),
      })
    })

    it('uses from as both start and end when to is undefined', () => {
      const onDateRangeChange = vi.fn()
      const from = new Date('2026-01-10T08:00:00')
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: [], nominalValue: null, onDateRangeChange }),
      )
      act(() => result.current.handleRangeSelect({ from, to: undefined }))
      expect(onDateRangeChange).toHaveBeenCalledWith({
        start: startOfDay(from).getTime(),
        end: endOfDay(from).getTime(),
      })
    })

    it('does not call onDateRangeChange when selected is undefined', () => {
      const onDateRangeChange = vi.fn()
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: [], nominalValue: null, onDateRangeChange }),
      )
      act(() => result.current.handleRangeSelect(undefined))
      expect(onDateRangeChange).not.toHaveBeenCalled()
    })

    it('does not call onDateRangeChange when from is missing', () => {
      const onDateRangeChange = vi.fn()
      const { result } = renderHook(() =>
        useEfficiencySiteView({ log: [], nominalValue: null, onDateRangeChange }),
      )
      act(() => result.current.handleRangeSelect({ from: undefined }))
      expect(onDateRangeChange).not.toHaveBeenCalled()
    })

    it('does nothing when onDateRangeChange is not provided', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      expect(() =>
        act(() => result.current.handleRangeSelect({ from: new Date(), to: new Date() })),
      ).not.toThrow()
    })
  })

  describe('handleToggleDataset', () => {
    it('does nothing for an out-of-range index', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      expect(() => act(() => result.current.handleToggleDataset(99))).not.toThrow()
      expect(result.current.legendData[0]?.hidden).toBe(false)
    })
  })

  describe('chartRef', () => {
    it('initialises to null', () => {
      const { result } = renderHook(() => useEfficiencySiteView({ log: [], nominalValue: null }))
      expect(result.current.chartRef.current).toBeNull()
    })
  })
})
