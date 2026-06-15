'use strict'

const GLOBAL_DATA_TYPES = {
  PRODUCTION_COSTS: 'productionCosts',
  FEATURES: 'features',
  SITE_ENERGY: 'siteEnergy',
  CONTAINER_SETTINGS: 'containerSettings'
}

const USER_SETTINGS_TYPE = 'userSettings'

const SUPER_ADMIN_ID = '1'
const SUPER_ADMIN_ROLE = '*'

const MIGRATED_USER_ROLES = {
  DEFAULT: 'site_operator',
  READ_ONLY: 'read_only_user'
}

const AUTH_PERMISSIONS = {
  MINER: 'miner',
  CONTAINER: 'container',
  MINERPOOL: 'minerpool',
  POWERMETER: 'powermeter',
  TEMP: 'temp',
  ELECTRICITY: 'electricity',
  FEATURES: 'features',
  REVENUE: 'revenue',
  ACTIONS: 'actions',
  USERS: 'users',
  PRODUCTION: 'production',
  ALERTS: 'alerts',
  CABINETS: 'cabinets',
  COMMENTS: 'comments',
  EXPLORER: 'explorer',
  INVENTORY: 'inventory',
  REPORTING: 'reporting',
  SETTINGS: 'settings',
  TICKETS: 'tickets',
  POWER_SPOT_FORECAST: 'power_spot_forecast',
  POOL_CONFIG: 'pool_config',
  POOL_CONFIG_APPROVE: 'pool_config_approve'
}

const AUTH_LEVELS = {
  READ: 'r',
  WRITE: 'w'
}

const AUTH_CAPS = Object.freeze({
  m: 'miner',
  c: 'container',
  mp: 'minerpool',
  p: 'powermeter',
  t: 'temp',
  e: 'electricity',
  f: 'features',
  r: 'revenue'
})

const COMMENT_ACTION = {
  ADD: 'saveThingComment',
  EDIT: 'editThingComment',
  DELETE: 'deleteThingComment'
}

const ENDPOINTS = {
  // OAuth endpoints
  OAUTH_GOOGLE_CALLBACK: '/oauth/google/callback',
  OAUTH_MICROSOFT_CALLBACK: '/oauth/microsoft/callback',

  // Auth endpoints
  USERINFO: '/auth/userinfo',
  TOKEN: '/auth/token',
  PERMISSIONS: '/auth/permissions',
  EXT_DATA: '/auth/ext-data',

  // User endpoints
  USERS: '/auth/users',
  USERS_DELETE: '/auth/users/delete',
  USER_SETTINGS: '/auth/user/settings',
  ROLES_PERMISSIONS: '/auth/roles/permissions',

  // Global endpoints
  GLOBAL_CONFIG: '/auth/global-config',
  GLOBAL_DATA: '/auth/global/data',
  FEATURE_CONFIG: '/auth/featureConfig',
  FEATURES: '/auth/features',
  SITE: '/auth/site',

  // Actions endpoints
  ACTIONS: '/auth/actions',
  ACTIONS_BATCH: '/auth/actions/batch',
  ACTIONS_SINGLE: '/auth/actions/:type/:id',
  ACTIONS_VOTING: '/auth/actions/voting',
  ACTIONS_VOTING_BATCH: '/auth/actions/voting/batch',
  ACTIONS_VOTE: '/auth/actions/voting/:id/vote',
  ACTIONS_CANCEL: '/auth/actions/voting/cancel',

  // Logs endpoints
  TAIL_LOG: '/auth/tail-log',
  TAIL_LOG_MULTI: '/auth/tail-log/multi',
  TAIL_LOG_RANGE_AGGR: '/auth/tail-log/range-aggr',
  HISTORY_LOG: '/auth/history-log',

  // Things endpoints
  LIST_THINGS: '/auth/list-things',
  LIST_RACKS: '/auth/list-racks',
  THING_COMMENT: '/auth/thing/comment',
  SETTINGS: '/auth/settings',
  WORKER_CONFIG: '/auth/worker-config',
  THING_CONFIG: '/auth/thing-config',

  // WebSocket endpoint
  WEBSOCKET: '/ws',

  // Finance endpoints
  FINANCE_ENERGY_BALANCE: '/auth/finance/energy-balance',
  FINANCE_EBITDA: '/auth/finance/ebitda',
  FINANCE_COST_SUMMARY: '/auth/finance/cost-summary',
  FINANCE_SUBSIDY_FEES: '/auth/finance/subsidy-fees',
  FINANCE_REVENUE: '/auth/finance/revenue',
  FINANCE_REVENUE_SUMMARY: '/auth/finance/revenue-summary',
  FINANCE_HASH_REVENUE: '/auth/finance/hash-revenue',

  // Pools endpoints
  POOLS: '/auth/pools',
  POOLS_BALANCE_HISTORY: '/auth/pools/:pool/balance-history',
  POOLS_THING_CONFIG: '/auth/pools/config/:id',
  POOLS_CONTAINERS_STATS: '/auth/pools/stats/containers',

  SITE_STATUS_LIVE: '/auth/site/status/live',

  // Generic Config endpoints (type passed as parameter)
  // Note: Config mutations (register, update, delete) go through pushAction endpoint
  CONFIGS: '/auth/configs/:type',
  // Device listing endpoints
  CONTAINERS: '/auth/containers',
  CABINETS: '/auth/cabinets',
  CABINET_BY_ID: '/auth/cabinets/:id',

  // Metrics endpoints
  METRICS_HASHRATE: '/auth/metrics/hashrate',
  METRICS_CONSUMPTION: '/auth/metrics/consumption',
  METRICS_EFFICIENCY: '/auth/metrics/efficiency',
  METRICS_MINER_STATUS: '/auth/metrics/miner-status',
  METRICS_POWER_MODE: '/auth/metrics/power-mode',
  METRICS_POWER_MODE_TIMELINE: '/auth/metrics/power-mode/timeline',
  METRICS_TEMPERATURE: '/auth/metrics/temperature',
  METRICS_CONTAINER_TELEMETRY: '/auth/metrics/containers/:id',
  METRICS_CONTAINER_HISTORY: '/auth/metrics/containers/:id/history',

  // Groups endpoints
  MINERS_GROUPS_STATS: '/auth/miners/groups/stats',

  // Alerts endpoints
  ALERTS_SITE: '/auth/alerts/site',
  ALERTS_HISTORY: '/auth/alerts/history',

  MINERS: '/auth/miners',
  // Cooling System endpoints
  COOLING_SYSTEM: '/auth/dcs/cooling-system',
  // Energy System endpoints
  ENERGY_SYSTEM: '/auth/dcs/energy-system',
  // Site Overview endpoints
  SITE_OVERVIEW_GROUPS: '/auth/site/overview/groups',
  // Site Efficiency endpoint
  SITE_EFFICIENCY: '/auth/site/efficiency',
  // Explorer endpoints
  EXPLORER_RACKS: '/auth/explorer/racks'
}

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
}

const OPERATIONS = {
  // Auth operations
  AUTH_USERINFO_READ: 'auth.userinfo.read',

  // User operations
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Actions operations
  ACTIONS_QUERY: 'actions.query',
  ACTIONS_VOTING: 'actions.voting',
  ACTIONS_VOTING_BATCH: 'actions.voting.batch',
  ACTIONS_VOTE: 'actions.vote',
  ACTIONS_CANCEL: 'actions.cancel',

  // Things operations
  THING_COMMENT_WRITE: 'thing.comment.write'
}

const DEFAULTS = {
  USER_ID: 'anonymous',
  OPERATION_COUNT: 1
}

const STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}

const LIST_THINGS = 'listThings'
const GET_HISTORICAL_LOGS = 'getHistoricalLogs'

const RPC_METHODS = {
  TAIL_LOG_RANGE_AGGR: 'tailLogCustomRangeAggr',
  GET_WRK_EXT_DATA: 'getWrkExtData',
  LIST_THINGS: 'listThings',
  GET_HISTORICAL_LOGS: 'getHistoricalLogs',
  TAIL_LOG: 'tailLog',
  GLOBAL_CONFIG: 'getGlobalConfig',
  GET_CONFIGS: 'getConfigs'
}

const WORKER_TYPES = {
  MINER: 'miner',
  CONTAINER: 'container',
  POWERMETER: 'powermeter',
  MINERPOOL: 'minerpool',
  MEMPOOL: 'mempool',
  ELECTRICITY: 'electricity'
}

const SEVERITY_LEVELS = new Set(['critical', 'high', 'medium', 'low'])

const ALERTS_DEFAULT_LIMIT = 100
const ALERTS_MAX_SITE_LIMIT = 200
const ALERTS_MAX_HISTORY_LIMIT = 1000

const SITE_ALERTS_FILTER_FIELDS = ['severity', 'type', 'container', 'deviceId']
const SITE_ALERTS_SEARCH_FIELDS = ['id', 'code', 'container']

const HISTORY_FILTER_FIELDS = ['severity', 'code', 'deviceType', 'container', 'deviceId', 'tags']
const HISTORY_SEARCH_FIELDS = ['name', 'description', 'position', 'code']

const POOL_ALERT_TYPES = [
  'all_pools_dead',
  'wrong_miner_pool',
  'wrong_miner_subaccount',
  'wrong_worker_name',
  'ip_worker_name'
]

const MINER_POOL_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  INACTIVE: 'inactive'
}

const METRICS_TIME = {
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  TWO_DAYS_MS: 2 * 24 * 60 * 60 * 1000,
  NINETY_DAYS_MS: 90 * 24 * 60 * 60 * 1000,
  THREE_HOURS_MS: 3 * 60 * 60 * 1000,
  ONE_MONTH_MS: 30 * 24 * 60 * 60 * 1000
}

const METRICS_DEFAULTS = {
  CONTAINER_HISTORY_LIMIT: 10080
}

const MINER_CATEGORIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  SLEEP: 'sleep',
  OFFLINE: 'offline',
  ERROR: 'error',
  NOT_MINING: 'notMining',
  MAINTENANCE: 'maintenance'
}

const LOG_KEYS = {
  STAT_RTD: 'stat-rtd',
  STAT_3H: 'stat-3h',
  STAT_5M: 'stat-5m',
  STAT_1D: 'stat-1D'
}

const WORKER_TAGS = {
  MINER: 't-miner',
  CONTAINER: 't-container',
  POWERMETER: 't-powermeter',
  TEMP_SENSOR: 't-sensor-temp'
}

const DEVICE_LIST_FIELDS = {
  id: 1, type: 1, code: 1, ip: 1, tags: 1, info: 1, rack: 1
}

// Cooling system field projections by type/view
const COOLING_SYSTEM_PROJECTIONS = {
  base: { id: 1, code: 1, type: 1, tags: 1, rack: 1 },
  equipment: {
    pumps: { 'last.snap.stats.dcs_specific.equipment.pumps': 1 },
    temperatures: { 'last.snap.stats.dcs_specific.equipment.temperatures': 1 },
    pressures: { 'last.snap.stats.dcs_specific.equipment.pressures': 1 },
    flows: { 'last.snap.stats.dcs_specific.equipment.flows': 1 },
    levels: { 'last.snap.stats.dcs_specific.equipment.levels': 1 },
    valves: { 'last.snap.stats.dcs_specific.equipment.valves': 1 },
    heat_exchangers: { 'last.snap.stats.dcs_specific.equipment.heat_exchangers': 1 },
    cooling_towers: { 'last.snap.stats.dcs_specific.equipment.cooling_towers': 1 },
    tanks: { 'last.snap.stats.dcs_specific.equipment.tanks': 1 },
    chillers: { 'last.snap.stats.dcs_specific.equipment.chillers': 1 },
    fan_coils: { 'last.snap.stats.dcs_specific.equipment.fan_coils': 1 },
    humidity_sensors: { 'last.snap.stats.dcs_specific.equipment.humidity_sensors': 1 },
    vibration_sensors: { 'last.snap.stats.dcs_specific.equipment.vibration_sensors': 1 },
    flow_switches: { 'last.snap.stats.dcs_specific.equipment.flow_switches': 1 }
  },
  config: { 'last.snap.config': 1 },
  stats: {
    flow: { 'last.snap.stats.flow': 1 },
    temperature: { 'last.snap.stats.temperature': 1 },
    humidity: { 'last.snap.stats.humidity': 1 }
  },
  miners: {
    circuit1: {
      'last.snap.stats.dcs_specific.equipment.pumps': 1,
      'last.snap.stats.dcs_specific.equipment.temperatures': 1,
      'last.snap.stats.dcs_specific.equipment.pressures': 1,
      'last.snap.stats.dcs_specific.equipment.flows': 1,
      'last.snap.stats.dcs_specific.equipment.heat_exchangers': 1,
      'last.snap.stats.dcs_specific.equipment.valves': 1,
      'last.snap.config.cooling_system': 1
    },
    circuit2: {
      'last.snap.stats.dcs_specific.equipment.pumps': 1,
      'last.snap.stats.dcs_specific.equipment.temperatures': 1,
      'last.snap.stats.dcs_specific.equipment.levels': 1,
      'last.snap.stats.dcs_specific.equipment.heat_exchangers': 1,
      'last.snap.stats.dcs_specific.equipment.cooling_towers': 1,
      'last.snap.stats.dcs_specific.equipment.valves': 1,
      'last.snap.stats.dcs_specific.equipment.tanks': 1,
      'last.snap.stats.dcs_specific.equipment.vibration_sensors': 1,
      'last.snap.stats.dcs_specific.equipment.fans': 1,
      'last.snap.config.cooling_system': 1
    },
    layout: {
      'last.snap.stats.dcs_specific.equipment.pumps': 1,
      'last.snap.stats.dcs_specific.equipment.temperatures': 1,
      'last.snap.stats.dcs_specific.equipment.pressures': 1,
      'last.snap.stats.dcs_specific.equipment.flows': 1,
      'last.snap.stats.dcs_specific.equipment.levels': 1,
      'last.snap.stats.dcs_specific.equipment.heat_exchangers': 1,
      'last.snap.stats.dcs_specific.equipment.cooling_towers': 1,
      'last.snap.stats.dcs_specific.equipment.valves': 1,
      'last.snap.stats.dcs_specific.equipment.tanks': 1,
      'last.snap.stats.dcs_specific.equipment.vibration_sensors': 1,
      'last.snap.stats.dcs_specific.equipment.fans': 1,
      'last.snap.stats.flow': 1,
      'last.snap.config.cooling_system': 1,
      'last.snap.config.mining': 1
    }
  },
  hvac: {
    circuit1: {
      'last.snap.stats.dcs_specific.equipment.pumps': 1,
      'last.snap.stats.dcs_specific.equipment.temperatures': 1,
      'last.snap.stats.dcs_specific.equipment.pressures': 1,
      'last.snap.stats.dcs_specific.equipment.flows': 1,
      'last.snap.stats.dcs_specific.equipment.levels': 1,
      'last.snap.stats.dcs_specific.equipment.chillers': 1,
      'last.snap.stats.dcs_specific.equipment.fan_coils': 1,
      'last.snap.stats.dcs_specific.equipment.fans': 1,
      'last.snap.stats.dcs_specific.equipment.valves': 1,
      'last.snap.stats.dcs_specific.equipment.tanks': 1,
      'last.snap.stats.dcs_specific.equipment.flow_switches': 1,
      'last.snap.config.cooling_system': 1
    },
    circuit2: {
      'last.snap.stats.dcs_specific.equipment.pumps': 1,
      'last.snap.stats.dcs_specific.equipment.temperatures': 1,
      'last.snap.stats.dcs_specific.equipment.flows': 1,
      'last.snap.stats.dcs_specific.equipment.levels': 1,
      'last.snap.stats.dcs_specific.equipment.cooling_towers': 1,
      'last.snap.stats.dcs_specific.equipment.vibration_sensors': 1,
      'last.snap.config.cooling_system': 1
    },
    layout: {
      'last.snap.stats.dcs_specific.equipment.pumps': 1,
      'last.snap.stats.dcs_specific.equipment.temperatures': 1,
      'last.snap.stats.dcs_specific.equipment.pressures': 1,
      'last.snap.stats.dcs_specific.equipment.flows': 1,
      'last.snap.stats.dcs_specific.equipment.levels': 1,
      'last.snap.stats.dcs_specific.equipment.chillers': 1,
      'last.snap.stats.dcs_specific.equipment.cooling_towers': 1,
      'last.snap.stats.dcs_specific.equipment.fan_coils': 1,
      'last.snap.stats.dcs_specific.equipment.fans': 1,
      'last.snap.stats.dcs_specific.equipment.valves': 1,
      'last.snap.stats.dcs_specific.equipment.tanks': 1,
      'last.snap.stats.dcs_specific.equipment.flow_switches': 1,
      'last.snap.stats.dcs_specific.equipment.vibration_sensors': 1,
      'last.snap.config.cooling_system': 1
    },
    ambient: {
      'last.snap.stats.dcs_specific.equipment.fan_coils': 1,
      'last.snap.stats.dcs_specific.equipment.humidity_sensors': 1,
      'last.snap.stats.humidity': 1,
      'last.snap.config.cooling_system': 1
    }
  }
}

const ENERGY_SYSTEM_PROJECTIONS = {
  base: { id: 1, code: 1, type: 1, tags: 1, rack: 1 },
  miners: {
    'last.snap.stats.dcs_specific.equipment.power_meters': 1,
    'last.snap.stats.energy': 1,
    'last.snap.config.energy_layout': 1
  },
  cooling_auxiliary: {
    'last.snap.stats.dcs_specific.equipment.power_meters': 1,
    'last.snap.stats.energy': 1,
    'last.snap.config.energy_layout': 1
  },
  layout: {
    'last.snap.stats.dcs_specific.equipment.power_meters': 1,
    'last.snap.stats.dcs_specific.equipment.protection_relays': 1,
    'last.snap.stats.dcs_specific.equipment.transformers': 1,
    'last.snap.stats.dcs_specific.equipment.distribution_boards': 1,
    'last.snap.stats.energy': 1,
    'last.snap.config.energy_layout': 1
  }
}

// Site Overview aggregation fields for group-level stats
const SITE_OVERVIEW_AGGR_FIELDS = {
  hashrate_mhs_5m_container_group_sum_aggr: 1,
  hashrate_mhs_5m_rack_group_sum_aggr: 1,
  power_w_container_group_sum_aggr: 1,
  power_w_rack_group_sum_aggr: 1,
  efficiency_w_ths_container_group_avg_aggr: 1,
  efficiency_w_ths_pdu_rack_group_avg_aggr: 1,
  hashrate_mhs_5m_pdu_rack_group_avg_aggr: 1,
  power_w_pdu_rack_group_sum_aggr: 1,
  offline_cnt: 1,
  error_cnt: 1,
  not_mining_cnt: 1,
  power_mode_sleep_cnt: 1,
  power_mode_low_cnt: 1,
  power_mode_normal_cnt: 1,
  power_mode_high_cnt: 1,
  hashrate_mhs_5m_active_container_group_cnt: 1
}

// DCS power meter field projections for site overview
const DCS_POWER_METER_FIELDS = {
  'last.snap.stats.dcs_specific.equipment.power_meters': 1,
  'last.snap.config.mining': 1,
  'last.snap.config.energy_layout': 1
}

// DCS field projections for site efficiency
const DCS_EFFICIENCY_FIELDS = {
  'last.snap.stats.dcs_specific.equipment.power_meters': 1,
  'last.snap.stats.dcs_specific.equipment.distribution_boards': 1,
  'last.snap.stats.dcs_specific.equipment.transformers': 1,
  'last.snap.config.mining': 1,
  'last.snap.config.energy_layout': 1
}

const LOG_FIELDS = {
  HASHRATE_SUM_TYPE_GROUP: 'hashrate_mhs_5m_type_group_sum',
  HASHRATE_SUM_CONTAINER_GROUP: 'hashrate_mhs_5m_container_group_sum',
  POWER_W_TYPE_GROUP_SUM: 'power_w_type_group_sum',
  POWER_W_CONTAINER_GROUP_SUM: 'power_w_container_group_sum'
}

const AGGR_FIELDS = {
  HASHRATE_SUM: 'hashrate_mhs_5m_sum_aggr',
  HASHRATE_SUM_TYPE_GROUP_AGGR: 'hashrate_mhs_5m_type_group_sum_aggr',
  HASHRATE_SUM_CONTAINER_GROUP_AGGR: 'hashrate_mhs_5m_container_group_sum_aggr',
  SITE_POWER: 'site_power_w',
  ENERGY_AGGR: 'energy_aggr',
  ACTIVE_ENERGY_IN: 'active_energy_in_aggr',
  UTE_ENERGY: 'ute_energy_aggr',
  EFFICIENCY: 'efficiency_w_ths_avg_aggr',
  POWER_MODE_GROUP: 'power_mode_group_aggr',
  STATUS_GROUP: 'status_group_aggr',
  TEMP_MAX: 'temperature_c_group_max_aggr',
  TEMP_AVG: 'temperature_c_group_avg_aggr',
  TYPE_CNT: 'type_cnt',
  OFFLINE_CNT: 'offline_cnt',
  SLEEP_CNT: 'power_mode_sleep_cnt',
  MAINTENANCE_CNT: 'maintenance_type_cnt',
  CONTAINER_SPECIFIC_STATS: 'container_specific_stats_group_aggr',
  HASHRATE_1M_CONTAINER_GROUP_SUM: 'hashrate_mhs_1m_container_group_sum_aggr',
  POWER_W_CONTAINER_GROUP_SUM: 'power_w_container_group_sum_aggr',
  POWER_W_TYPE_GROUP_SUM: 'power_w_type_group_sum_aggr',
  POWER_MODE_LOW_CNT: 'power_mode_low_cnt',
  POWER_MODE_NORMAL_CNT: 'power_mode_normal_cnt',
  POWER_MODE_HIGH_CNT: 'power_mode_high_cnt',
  ERROR_CNT: 'error_cnt',
  NOT_MINING_CNT: 'not_mining_cnt'
}

const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
}

const MINERPOOL_EXT_DATA_KEYS = {
  TRANSACTIONS: 'transactions',
  STATS: 'stats'
}

const NON_METRIC_KEYS = [
  'ts',
  'site',
  'year',
  'monthName',
  'month',
  'period'
]

const BTC_SATS = 100000000

const RANGE_BUCKETS = {
  '1D': 86400000,
  '1W': 604800000,
  '1M': 2592000000
}

const RPC_TIMEOUT = 15000
const RPC_CONCURRENCY_LIMIT = 2
const RPC_PAGE_LIMIT = 100

const AUTH_CACHE_TTL = 60 * 1000

const ACTIONS_MAX_QUERIES = 10
const ACTIONS_QUERIES_MAX_LENGTH = 1000

// Allowed config types for generic config CRUD
const CONFIG_TYPES = {
  POOL: 'pool'
}

const MINER_FIELD_MAP = {
  status: 'last.snap.stats.status',
  hashrate: 'last.snap.stats.hashrate_mhs',
  power: 'last.snap.stats.power_w',
  efficiency: 'last.snap.stats.efficiency_w_ths',
  temperature: 'last.snap.stats.temperature_c',
  powerMode: 'last.snap.config.power_mode',
  firmware: 'last.snap.config.firmware_ver',
  model: 'last.snap.model',
  ip: 'opts.address',
  container: 'info.container',
  rack: 'rack',
  serialNum: 'info.serialNum',
  macAddress: 'info.macAddress',
  pool: 'last.snap.config.pool_config.url',
  led: 'last.snap.config.led_status',
  alerts: 'last.alerts',
  poolConfig: 'info.poolConfig'
}

const MINER_PROJECTION_MAP = {
  id: ['id'],
  type: ['type'],
  model: ['last.snap.model', 'type'],
  code: ['code'],
  ip: ['opts.address'],
  container: ['info.container'],
  rack: ['rack'],
  position: ['info.pos'],
  status: ['last.snap.stats.status'],
  hashrate: ['last.snap.stats.hashrate_mhs'],
  power: ['last.snap.stats.power_w'],
  temperature: ['last.snap.stats.temperature_c'],
  efficiency: ['last.snap.stats.efficiency_w_ths'],
  uptime: ['last.uptime'],
  firmware: ['last.snap.config.firmware_ver'],
  powerMode: ['last.snap.config.power_mode'],
  ledStatus: ['last.snap.config.led_status'],
  poolConfig: ['last.snap.config.pool_config'],
  alerts: ['last.alerts'],
  comments: ['comments'],
  serialNum: ['info.serialNum'],
  macAddress: ['info.macAddress'],
  lastSeen: ['last.ts', 'ts']
}

const MINER_SEARCH_FIELDS = [
  'id',
  'opts.address',
  'info.serialNum',
  'info.macAddress',
  'info.container',
  'code',
  'type'
]

const MINER_DEFAULT_FIELDS = {
  id: 1,
  type: 1,
  code: 1,
  info: 1,
  tags: 1,
  rack: 1,
  comments: 1,
  'last.alerts': 1,
  'last.snap.stats': 1,
  'last.snap.config': 1,
  'last.snap.model': 1,
  'last.uptime': 1,
  'last.ts': 1,
  'opts.address': 1,
  ts: 1
}

const MINER_MAX_LIMIT = 200
const MINER_DEFAULT_LIMIT = 50

// Explorer racks aggregation fields
const EXPLORER_RACK_AGGR_FIELDS = {
  hashrate_mhs_5m_pdu_rack_group_avg_aggr: 1,
  power_w_pdu_rack_group_sum_aggr: 1,
  efficiency_w_ths_pdu_rack_group_avg_aggr: 1
}

const EXPLORER_RACK_DEFAULT_LIMIT = 20
const EXPLORER_RACK_MAX_LIMIT = 100

module.exports = {
  SUPER_ADMIN_ROLE,
  GLOBAL_DATA_TYPES,
  SUPER_ADMIN_ID,
  MIGRATED_USER_ROLES,
  COMMENT_ACTION,
  AUTH_PERMISSIONS,
  AUTH_LEVELS,
  AUTH_CAPS,
  ENDPOINTS,
  HTTP_METHODS,
  OPERATIONS,
  DEFAULTS,
  STATUS_CODES,
  RPC_TIMEOUT,
  RPC_CONCURRENCY_LIMIT,
  RPC_PAGE_LIMIT,
  AUTH_CACHE_TTL,
  ACTIONS_MAX_QUERIES,
  ACTIONS_QUERIES_MAX_LENGTH,
  USER_SETTINGS_TYPE,
  LIST_THINGS,
  GET_HISTORICAL_LOGS,
  RPC_METHODS,
  WORKER_TYPES,
  POOL_ALERT_TYPES,
  MINER_POOL_STATUS,
  AGGR_FIELDS,
  PERIOD_TYPES,
  MINERPOOL_EXT_DATA_KEYS,
  NON_METRIC_KEYS,
  BTC_SATS,
  RANGE_BUCKETS,
  CONFIG_TYPES,
  METRICS_TIME,
  METRICS_DEFAULTS,
  MINER_CATEGORIES,
  LOG_KEYS,
  WORKER_TAGS,
  SEVERITY_LEVELS,
  ALERTS_DEFAULT_LIMIT,
  ALERTS_MAX_SITE_LIMIT,
  ALERTS_MAX_HISTORY_LIMIT,
  SITE_ALERTS_FILTER_FIELDS,
  SITE_ALERTS_SEARCH_FIELDS,
  HISTORY_FILTER_FIELDS,
  HISTORY_SEARCH_FIELDS,
  DEVICE_LIST_FIELDS,
  MINER_FIELD_MAP,
  MINER_PROJECTION_MAP,
  MINER_SEARCH_FIELDS,
  MINER_DEFAULT_FIELDS,
  MINER_MAX_LIMIT,
  MINER_DEFAULT_LIMIT,
  COOLING_SYSTEM_PROJECTIONS,
  ENERGY_SYSTEM_PROJECTIONS,
  SITE_OVERVIEW_AGGR_FIELDS,
  DCS_POWER_METER_FIELDS,
  DCS_EFFICIENCY_FIELDS,
  EXPLORER_RACK_AGGR_FIELDS,
  EXPLORER_RACK_DEFAULT_LIMIT,
  EXPLORER_RACK_MAX_LIMIT,
  LOG_FIELDS
}
