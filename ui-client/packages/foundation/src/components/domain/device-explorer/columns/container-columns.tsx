import {
  AlertTriangleIcon,
  ErrorStatusIcon,
  formatValueUnit,
  OfflineStatusIcon,
  SimpleTooltip,
  UNITS,
  unitToKilo,
} from '@tetherto/mdk-core-ui'
import type { DataTableColumnDef } from '@tetherto/mdk-core-ui'
import type { DeviceExplorerDeviceData, GetColumnConfigParams } from '../types'
import { getAlarms } from '../device-explorer.utils'
import { StatusLabel } from '../components/status-label/status-label'
import { getContainerName, isContainerOffline } from '../../../../utils/container-utils'
import { DeviceCardColText } from '../components/device-card-col-text/device-card-col-text'
import _isFinite from 'lodash/isFinite'
import type { ContainerSnap } from '../../../../types/device'

export const getContainerColumns = ({
  getFormattedDate,
  renderAction,
}: GetColumnConfigParams): DataTableColumnDef<DeviceExplorerDeviceData>[] => [
  {
    id: 'ode',
    header: 'Container',
    cell: (info) => getContainerName(info.row.original?.info?.container),
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      const aName = getContainerName(a?.info?.container)
      const bName = getContainerName(b?.info?.container)
      return aName.localeCompare(bName)
    },
    size: 180,
  },
  {
    id: 'alarms',
    header: 'Alarms',
    cell: (info) => {
      const record = info.row.original
      const alarmStatus = Array.isArray(record?.last?.alerts) && record.last.alerts.length > 0
      const error = record?.last?.err
      if (!alarmStatus && !error) {
        return ''
      }
      if (alarmStatus) {
        const alarm = getAlarms(record as DeviceExplorerDeviceData, undefined, getFormattedDate)
        return (
          <SimpleTooltip content={String(JSON.stringify(alarm) || '')}>
            <div className="mdk-device-explorer__table__alarms__status-container">
              <AlertTriangleIcon />
            </div>
          </SimpleTooltip>
        )
      }
      if (error) {
        return (
          <SimpleTooltip content={`Error : ${error}`}>
            <StatusLabel status="error">
              <ErrorStatusIcon width={14} height={14} />
            </StatusLabel>
          </SimpleTooltip>
        )
      }
      return ''
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const record = info.row.original
      const { snap } = record?.last || {}

      return (
        <div className="mdk-device-explorer__table__cell-wrapper">
          {isContainerOffline(snap || {}) && (
            <StatusLabel status="offline">
              <OfflineStatusIcon width={14} height={14} />
            </StatusLabel>
          )}
          <DeviceCardColText
            style={{
              color: isContainerOffline(snap || {}) ? 'var(--mdk-button-danger-bg)' : 'inherit',
            }}
          >
            {(snap as ContainerSnap)?.stats?.status as string}
          </DeviceCardColText>
        </div>
      )
    },
  },
  {
    id: 'temperatureAmbient',
    header: 'Temp',
    accessorKey: 'temperatureAmbient',
    size: 80,
    cell: (info) => {
      const record = info.row.original

      const isValueAvailable = !isContainerOffline(record?.last?.snap || {})

      const value = isValueAvailable
        ? Number((record?.last?.snap as ContainerSnap)?.stats?.ambient_temp_c)
        : Number.NaN

      if (!_isFinite(value)) {
        return ''
      }

      return `${value} ${UNITS.TEMPERATURE_C}`
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      const aTemp = (a?.last?.snap as ContainerSnap)?.stats?.ambient_temp_c || 0
      const bTemp = (b?.last?.snap as ContainerSnap)?.stats?.ambient_temp_c || 0
      return aTemp - bTemp
    },
  },
  {
    header: 'Humidity',
    id: 'humidity',
    size: 100,
    cell: (info) => {
      const record = info.row.original

      if (!isContainerOffline(record?.last?.snap || {})) {
        return formatValueUnit(
          (record?.last?.snap as ContainerSnap)?.stats?.humidity_percent ?? 0,
          UNITS.PERCENT,
        )
      }
      return ''
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      const aHumidity = (a?.last?.snap as ContainerSnap)?.stats?.humidity_percent || 0
      const bHumidity = (b?.last?.snap as ContainerSnap)?.stats?.humidity_percent || 0
      return aHumidity - bHumidity
    },
  },
  {
    id: 'consumption',
    header: 'Consumption',
    size: 130,
    cell: (info) => {
      const record = info.row.original

      if (!isContainerOffline(record?.last?.snap || {})) {
        return formatValueUnit(
          unitToKilo((record?.last?.snap as ContainerSnap)?.stats?.power_w ?? 0),
          'kW',
        )
      }
      return ''
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original
      const aPower = (a?.last?.snap as ContainerSnap)?.stats?.power_w || 0
      const bPower = (b?.last?.snap as ContainerSnap)?.stats?.power_w || 0
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
