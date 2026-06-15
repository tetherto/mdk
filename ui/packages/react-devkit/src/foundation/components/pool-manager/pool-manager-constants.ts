import { COLOR, INDICATOR_COLORS } from '@core'
import { MinerStatuses, SITE_OVERVIEW_STATUSES } from '@tetherto/mdk-ui-core'

export { SITE_OVERVIEW_STATUSES }

export const POOL_VALIDATION_STATUSES = {
  TESTED: 'TESTED',
  NOT_TESTED: 'NOT_TESTED',
} as const

export const POOL_VALIDATION_STATUS_LABELS = {
  [POOL_VALIDATION_STATUSES.TESTED]: 'Tested',
  [POOL_VALIDATION_STATUSES.NOT_TESTED]: 'Not Tested',
} as const

export const POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE = {
  INCREMENTAL: 'INCREMENTAL',
} as const

export const POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_LABELS = {
  INCREMENTAL: 'Incremental',
} as const

/**
 * POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_OPTIONS constant.
 *
 * @category dashboards
 * @domain mining-operations
 * @tier internal
 */
export const POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_OPTIONS = Object.entries(
  POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_LABELS,
).map(([value, label]) => ({ value, label }))

export const SHOW_ADDITIONAL_FIELDS = false
export const POOL_ENDPOINT_ROLES = {
  PRIMARY: 'PRIMARY',
  FAILOVER_1: 'FAILOVER_1',
  FAILOVER_2: 'FAILOVER_2',
} as const

export const POOL_ENDPOINT_ROLE_COLORS = {
  [POOL_ENDPOINT_ROLES.PRIMARY]: COLOR.GREEN,
  [POOL_ENDPOINT_ROLES.FAILOVER_1]: COLOR.GRAY,
  [POOL_ENDPOINT_ROLES.FAILOVER_2]: COLOR.RED,
} as const

export const POOL_SETUPPABLE_MINERS_STATUSES = [
  MinerStatuses.MINING,
  MinerStatuses.NOT_MINING,
] as const

export const POOL_ENDPOINT_ROLES_LABELS = {
  [POOL_ENDPOINT_ROLES.PRIMARY]: 'PRIMARY',
  [POOL_ENDPOINT_ROLES.FAILOVER_1]: 'FAILOVER 1',
  [POOL_ENDPOINT_ROLES.FAILOVER_2]: 'FAILOVER 2',
} as const

export const POOL_ENDPOINT_INDEX_ROLES = {
  0: POOL_ENDPOINT_ROLES.PRIMARY,
  1: POOL_ENDPOINT_ROLES.FAILOVER_1,
  2: POOL_ENDPOINT_ROLES.FAILOVER_2,
} as const

/**
 * Select options listing the supported pool endpoint roles (primary / backup), used by pool-config forms.
 *
 * @category dashboards
 * @domain mining-operations
 * @tier internal
 */
export const POOL_ENDPOINT_ROLES_OPTIONS = Object.entries(POOL_ENDPOINT_ROLES_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export const POOL_ENDPOINT_REGIONS = {
  EUROPE: 'EUROPE',
} as const

export const POOL_ENDPOINT_REGIONS_LABELS = {
  [POOL_ENDPOINT_REGIONS.EUROPE]: POOL_ENDPOINT_REGIONS.EUROPE,
} as const

/**
 * Select options listing every supported pool endpoint region, used by pool-config forms.
 *
 * @category dashboards
 * @domain mining-operations
 * @tier internal
 */
export const POOL_ENDPOINT_REGIONS_OPTIONS = Object.entries(POOL_ENDPOINT_REGIONS_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export const SITE_OVERVIEW_STATUS_LABELS = {
  [SITE_OVERVIEW_STATUSES.OFFLINE]: 'Offline',
  [SITE_OVERVIEW_STATUSES.EMPTY]: 'Empty',
  [SITE_OVERVIEW_STATUSES.NOT_MINING]: 'Not Mining (Sleep + Error)',
  [SITE_OVERVIEW_STATUSES.MINING]: 'Online',
} as const

export const SITE_OVERVIEW_GRID_UNIT_COLORS = {
  [SITE_OVERVIEW_STATUSES.OFFLINE]: COLOR.SLATE_GRAY,
  [SITE_OVERVIEW_STATUSES.EMPTY]: COLOR.WHITE_ALPHA_08,
  [SITE_OVERVIEW_STATUSES.NOT_MINING]: COLOR.RED,
  [SITE_OVERVIEW_STATUSES.MINING]: COLOR.STRONG_GREEN,
} as const

export const SITE_OVERVIEW_STATUS_COLORS = {
  [SITE_OVERVIEW_STATUSES.OFFLINE]: INDICATOR_COLORS.GRAY,
  [SITE_OVERVIEW_STATUSES.EMPTY]: INDICATOR_COLORS.SLATE,
  [SITE_OVERVIEW_STATUSES.NOT_MINING]: INDICATOR_COLORS.RED,
  [SITE_OVERVIEW_STATUSES.MINING]: INDICATOR_COLORS.GREEN,
} as const

export const SiteOverviewDetailsLegendColors = {
  [SITE_OVERVIEW_STATUSES.OFFLINE]: COLOR.WHITE_ALPHA_05,
  [SITE_OVERVIEW_STATUSES.EMPTY]: COLOR.EBONY,
  [SITE_OVERVIEW_STATUSES.NOT_MINING]: COLOR.RED,
  [SITE_OVERVIEW_STATUSES.MINING]: COLOR.GREEN,
} as const

export const MINER_IN_POOL_STATUSES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  INACTIVE: 'inactive',
} as const

export const MINER_INFO_CARD_STATUSES = {
  OVERRIDE: 'Override',
  NORMAL: 'Normal',
} as const

export const MINER_IN_POOL_STATUS_COLORS = {
  [MINER_IN_POOL_STATUSES.ONLINE]: INDICATOR_COLORS.GREEN,
  [MINER_IN_POOL_STATUSES.OFFLINE]: INDICATOR_COLORS.RED,
  [MINER_IN_POOL_STATUSES.INACTIVE]: INDICATOR_COLORS.GRAY,
} as const

export const MINER_STATUS_TO_IN_POOL_STATUS = {
  [MinerStatuses.MINING]: MINER_IN_POOL_STATUSES.ONLINE,
  [MinerStatuses.OFFLINE]: MINER_IN_POOL_STATUSES.OFFLINE,
  [MinerStatuses.SLEEPING]: MINER_IN_POOL_STATUSES.INACTIVE,
  [MinerStatuses.ERROR]: MINER_IN_POOL_STATUSES.OFFLINE,
  [MinerStatuses.MAINTENANCE]: MINER_IN_POOL_STATUSES.INACTIVE,
  [MinerStatuses.ALERT]: MINER_IN_POOL_STATUSES.OFFLINE,
} as const

export const SETUP_POOLS_WARNING_MESSAGE =
  'Setup pool can cause a loss of efficiency during mining operations. It is recommended to setup pool when the miner is in Sleep mode.'

export const ADD_POOL_ENABLED = true
export const ADD_ENDPOINT_ENABLED = true
export const EDIT_ENDPOINT_ENABLED = true
export const ASSIGN_POOL_POPUP_ENABLED = true
export const POOL_STATUS_INDICATOR_ENABLED = false
export const SHOW_POOL_VALIDATION = false
export const SHOW_CREDENTIAL_TEMPLATE = false

export const MAX_POOL_ENDPOINTS = 3
