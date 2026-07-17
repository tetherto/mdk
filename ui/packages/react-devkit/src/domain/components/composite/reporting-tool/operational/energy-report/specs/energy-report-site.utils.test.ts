import { describe, expect, it } from 'vitest'

import { COMPLETE_MINER_TYPES } from '../../../../../../constants/device-constants'
import {
  buildSitePowerConsumptionSlice,
  getContainerMinersChartData,
  getMinersTypePowerModeChartData,
  mapConsumptionLogToChartPoints,
} from '../energy-report-site.utils'

describe('mapConsumptionLogToChartPoints', () => {
  it('maps v2 consumption log entries to chart data', () => {
    const points = mapConsumptionLogToChartPoints([
      { ts: 1000, powerW: 5000, consumptionMWh: 0.12 },
    ])
    expect(points).toEqual([{ ts: 1000, consumption: 5000 }])
  })

  it('returns empty array when log is undefined', () => {
    expect(mapConsumptionLogToChartPoints(undefined)).toEqual([])
  })
})

describe('buildSitePowerConsumptionSlice', () => {
  it('returns null nominalValue when nominal config is loading', () => {
    const slice = buildSitePowerConsumptionSlice({
      nominalConfigLoading: true,
      nominalMw: 2,
    })
    expect(slice.nominalValue).toBeNull()
  })

  it('converts nominal MW to watts', () => {
    const slice = buildSitePowerConsumptionSlice({ nominalMw: 2 })
    expect(slice.nominalValue).toBe(2_000_000)
  })

  it('shows isLoading when consumption is fetching', () => {
    const slice = buildSitePowerConsumptionSlice({ consumptionFetching: true })
    expect(slice.isLoading).toBe(true)
  })
})

describe('getMinersTypePowerModeChartData', () => {
  it('returns empty object when tailLogItem is empty', () => {
    expect(getMinersTypePowerModeChartData(COMPLETE_MINER_TYPES.ANTMINER_AM_S21, {})).toEqual({})
    expect(
      getMinersTypePowerModeChartData(COMPLETE_MINER_TYPES.ANTMINER_AM_S21, undefined),
    ).toEqual({})
  })

  it('returns data with totals when tailLogItem has data', () => {
    const type = COMPLETE_MINER_TYPES.ANTMINER_AM_S21
    const tailLogItem = {
      offline_type_cnt: { [type]: 2 },
      power_mode_normal_type_cnt: { [type]: 10 },
      maintenance_type_cnt: { [type]: 1 },
    }
    const result = getMinersTypePowerModeChartData(type, tailLogItem)
    expect(result.total).toBeGreaterThanOrEqual(0)
  })
})

describe('getContainerMinersChartData', () => {
  it('returns disconnected total when tail log empty', () => {
    const result = getContainerMinersChartData('bitdeer-1', {}, 10)
    expect(result.disconnected).toBe(10)
    expect(result.actualMiners).toBe(0)
  })
})
