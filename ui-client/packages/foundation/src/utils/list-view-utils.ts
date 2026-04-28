import type { CascaderOption } from '@tetherto/core'
import _capitalize from 'lodash/capitalize'
import { COMPLETE_CONTAINER_TYPE, CONTAINER_TYPE_NAME_MAP } from '../constants/container-constants'
import {
  CABINET_DEVICES_TYPES_NAME_MAP,
  COMPLETE_MINER_TYPES,
  LV_CABINET_DEVICES_TYPE,
  MINER_TYPE_NAME_MAP,
  MinerStatuses,
} from '../constants/device-constants'
import { CROSS_THING_TYPES } from '../constants/devices'
import { CONTAINER_STATUS, MINER_POWER_MODE } from './status-utils'

export type FilterOption = CascaderOption & {
  tab?: string[]
  order?: number
}

const FILTERABLE_MINER_STATUSES: Record<string, string> = {
  Mining: MinerStatuses.MINING,
  Offline: MinerStatuses.OFFLINE,
  Sleeping: MinerStatuses.SLEEPING,
  Error: MinerStatuses.ERROR,
  'Not Mining': MinerStatuses.NOT_MINING,
}

const toOptions = (
  types: string[] | Record<string, string>,
  names: Record<string, string>,
): CascaderOption[] => {
  const values = Array.isArray(types) ? types : Object.values(types)
  return values.map((value) => ({ label: names[value] ?? value, value }))
}

export const LIST_VIEW_FILTER_OPTIONS: FilterOption[] = [
  {
    label: 'Type',
    value: 'type',
    tab: [CROSS_THING_TYPES.CONTAINER, CROSS_THING_TYPES.MINER],
    order: 1,
    children: [
      {
        label: 'Container',
        value: CROSS_THING_TYPES.CONTAINER,
        children: toOptions(COMPLETE_CONTAINER_TYPE, CONTAINER_TYPE_NAME_MAP),
      },
      {
        label: 'Miner',
        value: CROSS_THING_TYPES.MINER,
        children: toOptions(COMPLETE_MINER_TYPES, MINER_TYPE_NAME_MAP),
      },
      {
        label: 'LV cabinet',
        value: CROSS_THING_TYPES.CABINET,
        children: toOptions(LV_CABINET_DEVICES_TYPE, CABINET_DEVICES_TYPES_NAME_MAP),
      },
    ],
  },
  {
    label: 'Status',
    value: 'last.snap.stats.status',
    order: 2,
    tab: [CROSS_THING_TYPES.CONTAINER],
    children: Object.values(CONTAINER_STATUS).map((status) => ({
      label: _capitalize(status),
      value: status,
    })),
  },
  {
    label: 'Status',
    value: 'last.snap.stats.status',
    order: 2,
    tab: [CROSS_THING_TYPES.MINER],
    children: Object.entries(FILTERABLE_MINER_STATUSES).map(([label, value]) => ({
      label: _capitalize(label),
      value,
    })),
  },
  {
    label: 'Container Alarm',
    value: 'last.snap.stats.alarm_status',
    order: 3,
    tab: [CROSS_THING_TYPES.CONTAINER],
    children: [
      { label: 'Alarm on', value: true },
      { label: 'Alarm off', value: false },
    ],
  },
  {
    label: 'Power mode',
    value: 'last.snap.config.power_mode',
    order: 4,
    tab: [CROSS_THING_TYPES.MINER],
    children: Object.values(MINER_POWER_MODE).map((powerMode) => ({
      label: _capitalize(powerMode),
      value: powerMode,
    })),
  },
  {
    label: 'Miner LED',
    value: 'last.snap.config.led_status',
    order: 7,
    tab: [CROSS_THING_TYPES.MINER],
    children: [
      { label: 'LED on', value: true },
      { label: 'LED off', value: false },
    ],
  },
]

export const getFilterOptionsByTab = (tab: string): FilterOption[] =>
  LIST_VIEW_FILTER_OPTIONS.filter((option) =>
    Array.isArray(option.tab) ? option.tab.includes(tab) : true,
  )
