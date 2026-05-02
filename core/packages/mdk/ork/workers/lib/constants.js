'use strict'

const ACTION_TYPES = {
  // Container actions
  SWITCH_CONTAINER: 'switchContainer',
  SWITCH_COOLING_SYSTEM: 'switchCoolingSystem',
  SET_TANK_ENABLED: 'setTankEnabled',
  SET_AIR_EXHAUST_ENABLED: 'setAirExhaustEnabled',
  RESET_COOLING_SYSTEM: 'resetCoolingSystem',
  SET_LIQUID_SUPPLY_TEMPERATURE: 'setLiquidSupplyTemperature',
  SET_TEMPERATURE_SETTINGS: 'setTemperatureSettings',
  SET_COOLING_FAN_THRESHOLD: 'setCoolingFanThreshold',
  SWITCH_SOCKET: 'switchSocket',
  RESET_ALARM: 'resetAlarm',
  RESET_CONTAINER: 'resetContainer',
  EMERGENCY_STOP: 'emergencyStop',
  MAINTENANCE: 'maintenance',

  // Miner actions
  REBOOT: 'reboot',
  SET_POWER_MODE: 'setPowerMode',
  SET_LED: 'setLED',
  SETUP_POOLS: 'setupPools',

  // Thing actions
  REGISTER_THING: 'registerThing',
  UPDATE_THING: 'updateThing',
  FORGET_THINGS: 'forgetThings',

  RACK_REBOOT: 'rackReboot',

  REGISTER_CONFIG: 'registerConfig',
  UPDATE_CONFIG: 'updateConfig',
  DELETE_CONFIG: 'deleteConfig'
}

const MS_24_HOURS = 24 * 60 * 60 * 1000
const DAILY_5_MIN_INTERVALS = 288

const OPTIONAL_CONFIGS = [
  { name: 'aggr.stats', key: 'aggrStats' },
  { name: 'aggr.data', key: 'aggrData' },
  { name: 'cross.aggr.action', key: 'crossAggrAction' },
  { name: 'global.config', key: 'globalConfig' },
  { name: 'aggr.crossthg', key: 'aggrCrossthg' }
]

const PERMISSION_LEVELS = {
  READ: 'r',
  WRITE: 'w',
  READ_WRITE: 'rw'
}

const COMMENT_ACTION = {
  ADD: 'saveThingComment',
  EDIT: 'editThingComment',
  DELETE: 'deleteThingComment'
}

const RPC_METHODS = [
  { name: 'registerRack', op: 'w' },
  { name: 'forgetRacks', op: 'w' },
  { name: 'listRacks', op: 'r' },
  { name: 'listThings', op: 'r' },
  { name: 'getThingsCount', op: 'r' },
  { name: 'getHistoricalLogs', op: 'r' },
  { name: 'forgetThings', op: 'w' },
  { name: 'tailLog', op: 'r' },
  { name: 'tailLogMulti', op: 'r' },
  { name: 'saveThingComment', op: 'w' },
  { name: 'editThingComment', op: 'w' },
  { name: 'deleteThingComment', op: 'w' },
  { name: 'pushAction', op: 'w' },
  { name: 'pushActionsBatch', op: 'w' },
  { name: 'setGlobalConfig', op: 'w' },
  { name: 'getGlobalConfig', op: 'r' },
  { name: 'getAction', op: 'r' },
  { name: 'voteAction', op: 'w' },
  { name: 'queryActions', op: 'r' },
  { name: 'getActionsBatch', op: 'r' },
  { name: 'cancelActionsBatch', op: 'w' },
  { name: 'getWrkExtData', op: 'r' },
  { name: 'tailLogCustomRangeAggr', op: 'r' },
  { name: 'getWrkConf', op: 'r' },
  { name: 'getThingConf', op: 'r' },
  { name: 'getWrkSettings', op: 'r' },
  { name: 'saveWrkSettings', op: 'w' },
  { name: 'getConfigs', op: 'r' }
]

const INVALID_ACTIONS_ERRORS = [
  'UNKNOWN_METHOD',
  'CHANNEL_CLOSED'
]

const DEFAULT_TIMEZONE = 'UTC'

const CONFIG_TYPES = {
  POOL: 'pool'
}

/**
 * Default action config resolvers - maps actions to their config resolution rules
 * The full config object is passed to the device worker which handles transformation
 *
 * Structure:
 * {
 *   [actionName]: {
 *     configIdParam: string,  // Param field containing the config ID
 *     configType: string      // Config type prefix in DB (e.g., 'pool' -> 'pool:configId')
 *   }
 * }
 */
const DEFAULT_ACTION_CONFIG_RESOLVERS = {
  setupPools: {
    configIdParam: 'poolConfigId',
    configType: 'pool'
  }
}

module.exports = {
  ACTION_TYPES,
  MS_24_HOURS,
  DAILY_5_MIN_INTERVALS,
  OPTIONAL_CONFIGS,
  PERMISSION_LEVELS,
  COMMENT_ACTION,
  RPC_METHODS,
  INVALID_ACTIONS_ERRORS,
  DEFAULT_TIMEZONE,
  CONFIG_TYPES,
  DEFAULT_ACTION_CONFIG_RESOLVERS
}
