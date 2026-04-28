import _forEach from 'lodash/forEach'
import _head from 'lodash/head'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _keys from 'lodash/keys'
import _last from 'lodash/last'
import _values from 'lodash/values'

import { formatUnit, getTimeRange, UNITS } from '@tetherto/mdk-core-ui'

import { CONTAINER_MODEL } from '../../../../constants/container-constants'
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
  tempPrefix: 'hot' | 'cold',
  colorIndex: number,
): void {
  if (isBitdeer(deviceName)) {
    _forEach(CONTAINER_CHART_PAIR_INDICES, (tank) => {
      const lineLabel = `${deviceName}-Temp-${tempPrefix === 'hot' ? 'H' : 'L'}-Tank-${tank}`
      const propName = `${tempPrefix}_temp_c_w_${tank}_group`
      if (_isNil(entryData?.[propName])) return
      addChartLine(chartObj, lineLabel, getLineColor(colorIndex))
      addDataPoint(chartObj[lineLabel], entryData[propName]!, ts)
    })
    return
  }

  if (_includes(deviceName, CONTAINER_MODEL.BITMAIN)) {
    const propName = isAntspaceHydro(deviceName)
      ? 'supply_liquid_temp_group'
      : 'primary_supply_temp_group'
    if (_isNil(entryData?.[propName])) return
    addChartLine(chartObj, deviceName, getLineColor(colorIndex))
    addDataPoint(chartObj[deviceName], entryData[propName]!, ts)
    return
  }

  if (isMicroBT(deviceName)) {
    const propName = 'unit_inlet_temp_t2_group'
    if (_isNil(entryData?.[propName])) return
    addChartLine(chartObj, deviceName, getLineColor(colorIndex))
    addDataPoint(chartObj[deviceName], entryData[propName]!, ts)
  }
}

export const getOverviewChartTempAdapter = (
  data: ChartEntry[] | null | undefined,
  tempPrefix: 'hot' | 'cold',
): OverviewChartResult => {
  if (!data) {
    return { datasets: [], yTicksFormatter: (v) => String(v), timeRange: null }
  }

  const dataByDevice: ChartDataByDevice = {}

  _forEach(data, (entry) => {
    const { container_specific_stats_group_aggr: entryDataByDevice, ts } = entry
    _forEach(_keys(entryDataByDevice), (device, index) => {
      if (!entryDataByDevice?.[device]) return
      addsValueToDataByDevice(
        dataByDevice,
        device,
        ts,
        entryDataByDevice[device]!,
        tempPrefix,
        index,
      )
    })
  })

  const timeRange = getTimeRange(_last(data)?.ts as number, _head(data)?.ts as number)

  return {
    yTicksFormatter: (value) => formatUnit({ value, unit: UNITS.TEMPERATURE_C }),
    timeRange,
    datasets: _values(dataByDevice),
  }
}
