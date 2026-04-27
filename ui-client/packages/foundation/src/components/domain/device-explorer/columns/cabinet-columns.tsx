import {
  formatValueUnit,
  SimpleTooltip,
  TemperatureIndicatorIcon,
  UNITS,
  unitToKilo,
} from '@mdk/core'
import type { DataTableColumnDef } from '@mdk/core'
import type { DeviceExplorerDeviceData, GetColumnConfigParams } from '../types'
import { isContainerOffline } from '../../../../utils/container-utils'
import {
  getCabinetTitle,
  getLvCabinetTempSensorColor,
  getRootTempSensorTempValue,
} from '../../../../utils/device-utils'
import _isNil from 'lodash/isNil'
import _head from 'lodash/head'
import _isNumber from 'lodash/isNumber'
import type { LvCabinetRecord } from '../../../../types/device'

export type GetCabinetColumnsParams = GetColumnConfigParams

export const getCabinetColumns = ({
  renderAction,
}: GetCabinetColumnsParams): DataTableColumnDef<DeviceExplorerDeviceData>[] => [
  {
    header: 'Cabinet',
    id: 'id',
    cell: (info) => getCabinetTitle(info.row.original as unknown as DeviceExplorerDeviceData),
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      const aName = getCabinetTitle(a as unknown as DeviceExplorerDeviceData)
      const bName = getCabinetTitle(b as unknown as DeviceExplorerDeviceData)
      return aName.localeCompare(bName)
    },
  },
  {
    header: 'Temperature',
    id: 'temperature',
    size: 140,
    cell: (info) => {
      const record = info.row.original
      const temperatureValue = getRootTempSensorTempValue(record) as number | undefined
      return (
        <SimpleTooltip content="Temperature">
          <div className="mdk-device-explorer__table__cell--type-temp">
            <TemperatureIndicatorIcon />
            <div style={{ color: getLvCabinetTempSensorColor(temperatureValue ?? 0) }}>
              {!_isNil(temperatureValue) ? `${temperatureValue} ${UNITS.TEMPERATURE_C}` : '-'}{' '}
            </div>
          </div>
        </SimpleTooltip>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      const aTemp = (getRootTempSensorTempValue(a) as number | undefined) || 0
      const bTemp = (getRootTempSensorTempValue(b) as number | undefined) || 0
      return aTemp - bTemp
    },
  },
  {
    header: 'Consumption',
    id: 'powerMode',
    cell: (info) => {
      const record = info.row.original as LvCabinetRecord

      const powerMode = _head(record?.powerMeters)
      const powerValue = powerMode?.last?.snap?.stats?.power_w
      return formatValueUnit(unitToKilo(_isNumber(powerValue) ? powerValue : 0), UNITS.POWER_KW)
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as LvCabinetRecord
      const b = rowB.original as LvCabinetRecord

      const aPower = _head(a?.powerMeters)?.last?.snap?.stats?.power_w || 0
      const bPower = _head(b?.powerMeters)?.last?.snap?.stats?.power_w || 0
      return aPower - bPower
    },
  },
  {
    header: 'Action',
    id: 'action',
    size: 80,
    cell: (info) => {
      const record = info.row.original
      if (isContainerOffline(record?.last?.snap || {})) {
        return null
      }

      return renderAction(record)
    },
    enableSorting: false,
  },
]
