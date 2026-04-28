import _forEach from 'lodash/forEach'
import _head from 'lodash/head'
import _isNil from 'lodash/isNil'
import _keys from 'lodash/keys'
import _last from 'lodash/last'
import _values from 'lodash/values'

import { formatUnit, getTimeRange, UNITS } from '@tetherto/core'

import { isAntspaceHydro, isBitdeer, isMicroBT } from '../../../../utils/container-utils'

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
      const lineLabel = `${deviceName}-Pressure-Tank-${tank}`
      const propName = `tank${tank}_bar_group`

      if (_isNil(entryData?.[propName])) return
      addChartLine(chartObj, lineLabel, getLineColor(colorIndex))
      addDataPoint(chartObj[lineLabel], entryData[propName]!, ts)
    })
    return
  }

  if (isAntspaceHydro(deviceName)) {
    const propName = 'supply_liquid_pressure_group'
    if (_isNil(entryData?.[propName])) return
    addChartLine(chartObj, deviceName, getLineColor(colorIndex))
    addDataPoint(chartObj[deviceName], entryData[propName]!, ts)
    return
  }

  if (isMicroBT(deviceName)) {
    const propName = 'unit_outlet_pressure_p3_group'
    if (_isNil(entryData?.[propName])) return
    addChartLine(chartObj, deviceName, getLineColor(colorIndex))
    addDataPoint(chartObj[deviceName], entryData[propName]!, ts)
  }
}

export const getOverviewChartPressureAdapter = (
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
      if (_isNil(entryDataByDevice?.[device])) return
      addsValueToDataByDevice(dataByDevice, device, ts, entryDataByDevice[device]!, index)
    })
  })

  const timeRange = getTimeRange(_last(data)?.ts as number, _head(data)?.ts as number)

  return {
    yTicksFormatter: (value) => formatUnit({ value, unit: UNITS.PRESSURE_BAR }),
    timeRange,
    datasets: _values(dataByDevice),
  }
}
