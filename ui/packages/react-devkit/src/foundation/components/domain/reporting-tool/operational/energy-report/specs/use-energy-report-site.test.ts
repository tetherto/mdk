import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useEnergyReportSite } from '../use-energy-report-site'

const defaultDateRange = { start: Date.now() - 86_400_000, end: Date.now() }

describe('useEnergyReportSite', () => {
  it('returns expected shape', () => {
    const { result } = renderHook(() =>
      useEnergyReportSite({ dateRange: defaultDateRange }),
    )
    expect(result.current.powerConsumptionData).toBeDefined()
    expect(result.current.powerModeData).toBeDefined()
    expect(result.current.containers).toEqual([])
    expect(result.current.tailLogData).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('maps v2 consumption log through powerConsumptionData', () => {
    const { result } = renderHook(() =>
      useEnergyReportSite({
        dateRange: defaultDateRange,
        consumptionLog: [{ ts: 1000, powerW: 5000, consumptionMWh: 0.1 }],
      }),
    )
    expect(result.current.powerConsumptionData.data).toEqual([
      { ts: 1000, consumption: 5000 },
    ])
  })

  it('attaches container miner counts from tail log', () => {
    const { result } = renderHook(() =>
      useEnergyReportSite({
        dateRange: defaultDateRange,
        tailLog: [
          [
            {
              hashrate_mhs_5m_active_container_group_cnt: { 'container-1': 3 },
            },
          ],
        ],
        containers: [{ containerId: 'container-1', info: { container: 'container-1' } }],
      }),
    )
    expect(result.current.containers[0]?.minersCount).toBe(3)
  })

  it('shows isLoading when tail log is loading', () => {
    const { result } = renderHook(() =>
      useEnergyReportSite({
        dateRange: defaultDateRange,
        tailLogLoading: true,
      }),
    )
    expect(result.current.isLoading).toBe(true)
  })
})
