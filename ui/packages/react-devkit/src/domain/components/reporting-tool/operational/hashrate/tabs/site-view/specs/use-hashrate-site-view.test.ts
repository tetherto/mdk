import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SITE_VIEW_SERIES_LABEL } from '../../../hashrate.constants'
import type { HashrateGroupedLog } from '../../../hashrate.types'
import { useHashrateSiteView } from '../use-hashrate-site-view'

const log: HashrateGroupedLog = [
  {
    ts: new Date('2026-05-19T12:00:00Z').getTime(),
    hashrateMhs: { 'miner-am-s19xp': 5_000_000 },
  },
  {
    ts: new Date('2026-05-20T12:00:00Z').getTime(),
    hashrateMhs: { 'miner-am-s19xp': 5_100_000 },
  },
]

describe('useHashrateSiteView', () => {
  it('exposes a single site hashrate legend item', () => {
    const { result } = renderHook(() =>
      useHashrateSiteView({ log: [], selectedMinerTypes: [] }),
    )
    expect(result.current.legendData).toHaveLength(1)
    expect(result.current.legendData[0]?.label).toBe(SITE_VIEW_SERIES_LABEL)
  })

  it('marks the series hidden after toggling', () => {
    const { result } = renderHook(() =>
      useHashrateSiteView({ log, selectedMinerTypes: [] }),
    )
    act(() => result.current.handleToggleDataset(0))
    expect(result.current.legendData[0]?.hidden).toBe(true)
    expect(result.current.lineChartData.datasets[0]?.visible).toBe(false)
  })

  it('reports empty when log is empty', () => {
    const { result } = renderHook(() =>
      useHashrateSiteView({ log: [], selectedMinerTypes: [] }),
    )
    expect(result.current.isEmpty).toBe(true)
  })

  it('builds line chart points from grouped log', () => {
    const { result } = renderHook(() =>
      useHashrateSiteView({ log, selectedMinerTypes: [] }),
    )
    expect(result.current.isEmpty).toBe(false)
    expect(result.current.lineChartData.datasets[0]?.data).toHaveLength(2)
  })

  it('forwards date range selections', () => {
    const onDateRangeChange = vi.fn()
    const { result } = renderHook(() =>
      useHashrateSiteView({ log, selectedMinerTypes: [], onDateRangeChange }),
    )
    act(() =>
      result.current.handleRangeSelect({
        from: new Date('2026-05-19T00:00:00Z'),
        to: new Date('2026-05-25T23:59:59Z'),
      }),
    )
    expect(onDateRangeChange).toHaveBeenCalledOnce()
  })
})
