import _forEach from 'lodash/forEach'
import _head from 'lodash/head'
import _isNil from 'lodash/isNil'
import _keys from 'lodash/keys'
import _last from 'lodash/last'
import _replace from 'lodash/replace'
import _values from 'lodash/values'

import { formatUnit, getTimeRange, UNITS } from '@tetherto/core'

import { isAntspaceImmersion, isBitdeer } from '../../../../utils/container-utils'

import { CONTAINER_CHART_PAIR_INDICES } from './container-charts.constants'
import { addChartLine, addDataPoint, getLineColor } from './container-charts.utils'
import type {
  ChartDataByDevice,
  ChartEntry,
  EntryData,
  OverviewChartResult,
} from './container-charts.types'

function addsValueToDataByDevice(
  chartObj: ChartDataByDevice,
  deviceName: string,
  ts: number | string,
  entryData: EntryData,
  colorIndex: number,
): void {
  if (isBitdeer(deviceName)) {
    _forEach(CONTAINER_CHART_PAIR_INDICES, (tank) => {
      const lineLabel = `${deviceName}-Oil-Tank-${tank}`
      const propName = `cold_temp_c_${tank}_group`

      if (_isNil(entryData?.[propName])) return

      addChartLine(chartObj, lineLabel, getLineColor(colorIndex))
      addDataPoint(chartObj[lineLabel], entryData[propName]!, ts)
    })
  }

  if (isAntspaceImmersion(_replace(deviceName, '_', '-'))) {
    _forEach(CONTAINER_CHART_PAIR_INDICES, (supply) => {
      const lineLabel = `${deviceName}-Oil-temp-${supply}`
      const propName = `second_supply_temp${supply}_group`

      if (_isNil(entryData?.[propName])) return

      addChartLine(chartObj, lineLabel, getLineColor(colorIndex))
      addDataPoint(chartObj[lineLabel], entryData[propName]!, ts)
    })
  }
}

export const getOverviewChartOilAdapter = (
  data: ChartEntry[] | null | undefined,
): OverviewChartResult => {
  if (!data) {
    return {
      datasets: [],
      yTicksFormatter: (v) => String(v),
      timeRange: null,
    }
  }

  const dataByDevice: ChartDataByDevice = {}

  _forEach(data, (entry) => {
    const { container_specific_stats_group_aggr: entryDataByDevice, ts } = entry
    _forEach(_keys(entryDataByDevice), (device, index) => {
      if (!entryDataByDevice?.[device]) return

      addsValueToDataByDevice(dataByDevice, device, ts, entryDataByDevice[device]!, index)
    })
  })

  const timeRange = getTimeRange(_last(data)?.ts as number, _head(data)?.ts as number)
  return {
    yTicksFormatter: (value) => formatUnit({ value, unit: UNITS.TEMPERATURE_C }),
    timeRange,
    datasets: _values(dataByDevice),
  }
}
