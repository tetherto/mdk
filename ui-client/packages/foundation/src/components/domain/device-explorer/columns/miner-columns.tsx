import {
  cn,
  formatMacAddress,
  formatNumber,
  formatValueUnit,
  PowerIcon,
  SimpleTooltip,
  UNITS,
} from '@tetherto/core'
import type { DataTableColumnDef, UnknownRecord } from '@tetherto/core'
import type { Alert, DeviceExplorerDeviceData, GetColumnConfigParams } from '../types'
import { DeviceCardColText } from '../components/device-card-col-text/device-card-col-text'
import type { PowerModeColors } from '../../../../utils/device-utils'
import {
  formatPowerConsumption,
  getHashrateString,
  getMinerName,
  getOnOffText,
  getPowerModeColor,
  isMinerOffline,
  megaToTera,
} from '../../../../utils/device-utils'
import { MAINTENANCE_CONTAINER } from '../../../../constants/container-constants'
import { MinerStatusIndicator } from '../components/mining-status-indicator/mining-status-indicator'
import { formatDistanceStrict } from 'date-fns/formatDistanceStrict'
import _isUndefined from 'lodash/isUndefined'
import { CELL_MIN_WIDTH, ERROR_MESSAGES } from './column-constants'
import type { MinerRecord } from '../../../../types/device'

export type GetMinerColumnsParams = GetColumnConfigParams

export const getMinerColumns = ({
  getFormattedDate,
}: GetMinerColumnsParams): DataTableColumnDef<DeviceExplorerDeviceData>[] => [
  {
    header: 'Code',
    accessorKey: 'shortCode',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => <DeviceCardColText>{info.getValue() as string}</DeviceCardColText>,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      return `${getMinerName(a?.type || '')}`.localeCompare(`${getMinerName(b?.type || '')}`)
    },
  },
  {
    header: 'Container',
    accessorKey: 'container',
    minSize: CELL_MIN_WIDTH,

    cell: (info) => {
      const containerName = info.getValue() as string
      const deviceRecord = info.row.original

      const { err, error } = deviceRecord

      return (
        <div>
          {containerName === MAINTENANCE_CONTAINER ? (
            <DeviceCardColText
              style={{
                color: 'var(--mdk-color-warning)',
              }}
            >
              Maintenance
            </DeviceCardColText>
          ) : (
            <DeviceCardColText>{containerName}</DeviceCardColText>
          )}
          {Boolean(error || err) && (
            <DeviceCardColText style={{ color: 'var(--mdk-button-danger-bg)' }}>
              {
                (err
                  ? ERROR_MESSAGES[err as keyof typeof ERROR_MESSAGES] || err
                  : error || err) as string
              }
            </DeviceCardColText>
          )}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original
      return `${a?.info?.container}`.localeCompare(`${b?.info?.container}`)
    },
  },
  {
    header: 'POS',
    id: 'position',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const deviceRecord = info.row.original
      return <DeviceCardColText>{deviceRecord.info?.pos}</DeviceCardColText>
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      return `${a?.info?.pos}`.localeCompare(`${b?.info?.pos}`)
    },
  },
  {
    header: 'SN',
    accessorKey: 'serialNum',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => <DeviceCardColText>{info.getValue() as string}</DeviceCardColText>,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      return `${a?.info?.serialNum}`.localeCompare(`${b?.info?.serialNum}`)
    },
  },
  {
    header: 'MAC',
    accessorKey: 'macAddress',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const macAddress = info.getValue() as string | undefined
      return (
        <DeviceCardColText>{macAddress ? formatMacAddress(macAddress) : '-'}</DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      return `${a?.info?.macAddress}`.localeCompare(`${b?.info?.macAddress}`)
    },
  },
  {
    header: 'IP',
    id: 'ip',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { address } = info.row.original

      return <DeviceCardColText>{address}</DeviceCardColText>
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original
      const b = rowB.original

      return `${a?.address}`.localeCompare(`${b?.address}`)
    },
  },
  {
    header: 'Status',
    id: 'status',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { stats, alerts } = info.row.original as MinerRecord
      const alertsArray: Alert[] = Array.isArray(alerts) ? (alerts as Alert[]) : []
      const statsForIndicator = stats as UnknownRecord | undefined

      return (
        <div className="mdk-device-explorer__table__cell--type-status">
          <MinerStatusIndicator
            stats={statsForIndicator}
            alerts={alertsArray}
            getFormattedDate={getFormattedDate}
          />
          <div className="mdk-device-explorer__table__cell--type-status__value">
            {String(stats?.status || '')}
          </div>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.stats?.status}`.localeCompare(`${b?.stats?.status}`)
    },
  },
  {
    header: 'Power Mode',
    id: 'powerMode',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, err, device } = info.row.original as MinerRecord
      const power_mode = device?.last?.snap?.config?.power_mode

      const showNil = error || err || (device && isMinerOffline(device))

      return showNil ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <div className="mdk-device-explorer__table__cell--type-power-mode">
          <div
            className="mdk-device-explorer__table__cell--type-power-mode__icon"
            style={{
              color: getPowerModeColor(power_mode as keyof typeof PowerModeColors) ?? 'inherit',
            }}
          >
            <PowerIcon />
          </div>
          <div className="mdk-device-explorer__table__cell--type-power-mode__value">
            {power_mode}
          </div>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return a?.config?.power_mode?.localeCompare(b?.config?.power_mode || '') || 0
    },
  },
  {
    header: 'Elapsed',
    id: 'elapsedTime',
    minSize: CELL_MIN_WIDTH,

    cell: (info) => {
      const { error, stats, err, device } = info.row.original as MinerRecord

      return error || err || (device && isMinerOffline(device)) ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <DeviceCardColText>
          {stats?.uptime_ms
            ? formatDistanceStrict(new Date(Date.now() - (stats.uptime_ms ?? 0)), new Date(), {
                addSuffix: true,
              })
            : '-'}
        </DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.stats?.uptime_ms}`.localeCompare(`${b?.stats?.uptime_ms}`)
    },
  },
  {
    header: 'Consumption',
    id: 'consumption',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, stats, err, device } = info.row.original as MinerRecord
      const power_w = stats?.power_w ?? 0
      const { value, unit } = formatPowerConsumption(power_w)

      const displayValue =
        unit === UNITS.POWER_KW
          ? formatNumber(value ?? 0, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : (value ?? 0)

      return error || err || (device && isMinerOffline(device)) ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <DeviceCardColText>{power_w > 0 ? `${displayValue} ${unit}` : '-'}</DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.stats?.power_w}`.localeCompare(`${b?.stats?.power_w}`)
    },
  },
  {
    header: 'Hashrate',
    id: 'hashrate',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, stats, err, device } = info.row.original as MinerRecord
      const hashRate = stats?.hashrate_mhs?.t_5m ?? 0
      const formattedHashRate = getHashrateString(hashRate)

      return error || err || (device && isMinerOffline(device)) ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <DeviceCardColText>
          <div className="mdk-device-explorer__table__cell--type-hash-rate">
            {stats?.hashrate_mhs ? formattedHashRate : '-'}
          </div>
        </DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.stats?.hashrate_mhs?.t_5m}`.localeCompare(`${b?.stats?.hashrate_mhs?.t_5m}`)
    },
  },
  {
    header: 'Efficiency',
    id: 'efficiency',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, stats, err, device } = info.row.original as MinerRecord
      const hashRate = stats?.hashrate_mhs?.t_5m

      return error || err || (device && isMinerOffline(device)) ? (
        <div className="mdk-device-explorer__table__cell--type-efficiency">-</div>
      ) : (
        <div className="mdk-device-explorer__table__cell--type-efficiency">
          {!stats?.power_w || !hashRate || hashRate <= 0
            ? '-'
            : formatValueUnit(stats?.power_w / megaToTera(hashRate), UNITS.EFFICIENCY_W_PER_TH_S)}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      const aPower = a?.stats?.power_w ?? 0
      const aHash = megaToTera(a?.stats?.hashrate_mhs?.t_5m ?? 0)
      const bPower = b?.stats?.power_w ?? 0
      const bHash = megaToTera(b?.stats?.hashrate_mhs?.t_5m ?? 0)
      const aEfficiency = aHash > 0 ? aPower / aHash : 0
      const bEfficiency = bHash > 0 ? bPower / bHash : 0
      return `${aEfficiency}`.localeCompare(`${bEfficiency}`)
    },
  },
  {
    header: 'Pool Hashrate',
    id: 'poolHashrate',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, stats, err, isPoolStatsEnabled, device } = info.row.original as MinerRecord

      const isEmpty =
        !isPoolStatsEnabled ||
        !stats?.poolHashrate ||
        error ||
        err ||
        (device && isMinerOffline(device))

      const content = isEmpty ? (
        '-'
      ) : (
        <div className="mdk-device-explorer__table__cell--type-hash-rate">
          <SimpleTooltip content="Pool Hashrate">{stats?.poolHashrate}</SimpleTooltip>
        </div>
      )

      return <div className="mdk-device-explorer__table__cell--type-hash-rate">{content}</div>
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.stats?.poolHashrate}`.localeCompare(`${b?.stats?.poolHashrate}`)
    },
  },
  {
    header: 'FW Version',
    id: 'fwVersion',
    minSize: CELL_MIN_WIDTH,
    size: 180,
    cell: (info) => {
      const { error, config, err, device } = info.row.original as MinerRecord

      return error || err || (device && isMinerOffline(device)) ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <DeviceCardColText>{config?.firmware_ver || '-'}</DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.config?.firmware_ver}`.localeCompare(`${b?.config?.firmware_ver}`)
    },
  },
  {
    header: 'LED',
    id: 'ledStatus',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, config, err, device } = info.row.original as MinerRecord

      const isError =
        error || err || (device && isMinerOffline(device)) || _isUndefined(config?.led_status)

      return isError ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <DeviceCardColText>
          <div
            className={cn('mdk-device-explorer__table__cell--type-led', {
              'mdk-device-explorer__table__cell--type-led--value-on': config?.led_status,
            })}
          >
            {getOnOffText(config?.led_status)}
          </div>
        </DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.config?.led_status}`.localeCompare(`${b?.config?.led_status}`)
    },
  },
  {
    header: 'Max Temp',
    id: 'temperature',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const { error, stats, err, device } = info.row.original as MinerRecord

      return error || err || (device && isMinerOffline(device)) ? (
        <DeviceCardColText>-</DeviceCardColText>
      ) : (
        <DeviceCardColText>
          {stats?.temperature_c?.max ? `${stats?.temperature_c?.max} °C` : '-'}
        </DeviceCardColText>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original as MinerRecord
      const b = rowB.original as MinerRecord

      return `${a?.stats?.temperature_c?.max}`.localeCompare(`${b?.stats?.temperature_c?.max}`)
    },
  },
]
