import type { CascaderOption } from '@tetherto/mdk-core-ui'
import _capitalize from 'lodash/capitalize'
import _map from 'lodash/map'

import { MinerStatuses } from '../../../../constants/device-constants'
import { TYPE_FILTER_MAP } from '../../../../utils/action-utils'

export const FILTERABLE_MINER_STATUSES: Record<string, string> = {
  Mining: MinerStatuses.MINING,
  Offline: MinerStatuses.OFFLINE,
  Sleeping: MinerStatuses.SLEEPING,
  Error: MinerStatuses.ERROR,
  'Not Mining': MinerStatuses.NOT_MINING,
}

export const ALERT_SEVERITY_OPTIONS: CascaderOption[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
]

export const ALERT_STATUS_OPTIONS: CascaderOption[] = _map(
  FILTERABLE_MINER_STATUSES,
  (value, label) => ({
    label: _capitalize(label),
    value,
  }),
)

export const ALERT_TYPE_DEFAULT_CHILDREN: CascaderOption[] = [
  TYPE_FILTER_MAP.CONTAINER!,
  TYPE_FILTER_MAP.MINER!,
  TYPE_FILTER_MAP.LV_CABINET!,
  TYPE_FILTER_MAP.POOL!,
]

export const ALERTS_FILTER_OPTIONS: CascaderOption[] = [
  {
    label: 'Status',
    value: 'status',
    children: ALERT_STATUS_OPTIONS,
  },
  {
    label: 'Severity',
    value: 'severity',
    children: ALERT_SEVERITY_OPTIONS,
  },
  {
    label: 'Type',
    value: 'type',
    children: ALERT_TYPE_DEFAULT_CHILDREN,
  },
]
