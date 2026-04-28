import type { IndicatorColor } from '@tetherto/core'
import { COLOR } from '@tetherto/core'
import { MinerStatuses } from '../../../../../constants/device-constants'
import { PowerModeColors } from '../../../../../utils/device-utils'
import { MINER_POWER_MODE, SOCKET_STATUSES } from '../../../../../utils/status-utils'

type StatusItems = (
  | (typeof MinerStatuses)[keyof typeof MinerStatuses]
  | (typeof MINER_POWER_MODE)[keyof typeof MINER_POWER_MODE]
  | (typeof SOCKET_STATUSES)[keyof typeof SOCKET_STATUSES]
)[]

const MINERS_ACTIVITY_COMMON_ITEMS = [
  MinerStatuses.OFFLINE,
  MinerStatuses.NOT_MINING,
  MINER_POWER_MODE.LOW,
  MINER_POWER_MODE.NORMAL,
  MINER_POWER_MODE.HIGH,
]

const MINERS_ACTIVITY_ITEMS_RAW = {
  WITH_MAINTENANCE: [...MINERS_ACTIVITY_COMMON_ITEMS, MinerStatuses.MAINTENANCE],
  WOUT_MAINTENANCE: [...MINERS_ACTIVITY_COMMON_ITEMS, SOCKET_STATUSES.MINER_DISCONNECTED],
}

const commonItemsNotMiningIndex = MINERS_ACTIVITY_COMMON_ITEMS.indexOf(MinerStatuses.NOT_MINING)

const extendItems = (rawItems: StatusItems) => {
  const items = [...rawItems]

  items.splice(commonItemsNotMiningIndex, 1, MinerStatuses.ERROR, MINER_POWER_MODE.SLEEP)

  return items
}

export const MINERS_ACTIVITY_ITEMS = {
  SHORT: MINERS_ACTIVITY_ITEMS_RAW,
  EXTENDED: {
    WITH_MAINTENANCE: extendItems(MINERS_ACTIVITY_ITEMS_RAW.WITH_MAINTENANCE),
    WOUT_MAINTENANCE: extendItems(MINERS_ACTIVITY_ITEMS_RAW.WOUT_MAINTENANCE),
  },
}

export const MINERS_ACTIVITY_TOOLTIPS = {
  // eslint-disable-next-line style/quotes
  [MinerStatuses.ERROR]: "This does not include minor errors not affecting the miner's hash rate",
}

export const MINERS_ACTIVITY_LABELS = {
  [SOCKET_STATUSES.MINER_DISCONNECTED]: 'empty',
}

export const MinersActivityIndicatorColors = {
  [MinerStatuses.OFFLINE]: 'gray',
  [MinerStatuses.ERROR]: 'red',
  [MINER_POWER_MODE.LOW]: 'yellow',
  [MINER_POWER_MODE.NORMAL]: 'green',
  [MINER_POWER_MODE.HIGH]: 'purple',
} satisfies Record<string, IndicatorColor>

export const MinerStatusColors: Partial<
  Record<(typeof MinerStatuses)[keyof typeof MinerStatuses], string>
> = {
  [MinerStatuses.ERROR]: COLOR.BRICK_RED,
  [MinerStatuses.NOT_MINING]: COLOR.BRICK_RED,
  [MinerStatuses.OFFLINE]: COLOR.DARK_GREY,
  [MinerStatuses.SLEEPING]: COLOR.SLEEP_BLUE,
  [MinerStatuses.MAINTENANCE]: COLOR.ORANGE_WARNING,
} as const

export const SOCKET_CONTAINER_COLOR = {
  ...MinerStatusColors,
  ...PowerModeColors,
  [SOCKET_STATUSES.ERROR_MINING]: COLOR.COLD_ORANGE,
  [SOCKET_STATUSES.MINER_DISCONNECTED]: COLOR.SIMPLE_BLACK,
} as const
