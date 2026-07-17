import { WEBAPP_NAME } from './index'

export const ACTION_TYPES = {
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
  SETUP_FREQUENCY_SPEED: 'setUpfreqSpeed',
  SET_LED: 'setLED',
  SETUP_POOLS: 'setupPools',

  // Thing actions
  REGISTER_THING: 'registerThing',
  UPDATE_THING: 'updateThing',
  FORGET_THINGS: 'forgetThings',

  // Rack actions
  RACK_REBOOT: 'rackReboot',

  // Pool Manager
  REGISTER_POOL_CONFIG: 'registerConfig',
  UPDATE_POOL_CONFIG: 'updateConfig',
} as const

export const ACTION_SUFFIXES = {
  REPAIR: 'repair',
}

export const SUBMIT_ACTION_TYPES = {
  VOTING: 'voting',
  POOL: 'pool',
}

export const BATCH_ACTION_TYPES = {
  // Repair actions
  ATTACH_SPARE_PARTS: 'attachSpareParts',
  MOVE_MINER: 'moveMiner',
  // Others
  BULK_ADD_SPARE_PARTS: 'bulkAddSpareParts',
  BATCH_MOVE_SPARE_PARTS: 'batchMoveSpareParts',
  MOVE_BACK_FROM_MAINTENANCE_TO_CONTAINER: 'moveBackFromMaintenanceToContainer',
  DELETE_MINER: 'deleteMiner',
} as const

export const BATCH_ACTION_TYPE = new Set([
  BATCH_ACTION_TYPES.BULK_ADD_SPARE_PARTS,
  BATCH_ACTION_TYPES.ATTACH_SPARE_PARTS,
  BATCH_ACTION_TYPES.MOVE_MINER,
  BATCH_ACTION_TYPES.MOVE_BACK_FROM_MAINTENANCE_TO_CONTAINER,
  BATCH_ACTION_TYPES.DELETE_MINER,
  BATCH_ACTION_TYPES.BATCH_MOVE_SPARE_PARTS,
])

export const ACTION_NAMES_MAP = {
  [ACTION_TYPES.SWITCH_CONTAINER]: 'Switch Container',
  [ACTION_TYPES.SWITCH_COOLING_SYSTEM]: 'Switch Cooling System',
  [ACTION_TYPES.SET_TANK_ENABLED]: 'Set Tank Enabled',
  [ACTION_TYPES.SET_AIR_EXHAUST_ENABLED]: 'Set Air Exhaust Enabled',
  [ACTION_TYPES.RESET_COOLING_SYSTEM]: 'Reset Cooling System',
  [ACTION_TYPES.SET_LIQUID_SUPPLY_TEMPERATURE]: 'Set Liquid Supply Temperature',
  [ACTION_TYPES.SET_TEMPERATURE_SETTINGS]: 'Set Temperature Settings',
  [ACTION_TYPES.SET_COOLING_FAN_THRESHOLD]: 'Set Cooling Fan Threshold',
  [ACTION_TYPES.SWITCH_SOCKET]: 'Switch Socket',
  [ACTION_TYPES.RESET_ALARM]: 'Reset Alarm',
  [ACTION_TYPES.RESET_CONTAINER]: 'Reset Container',
  [ACTION_TYPES.EMERGENCY_STOP]: 'Emergency Stop Container',
  [ACTION_TYPES.MAINTENANCE]: 'Container Maintenance',

  // Miner actions
  [ACTION_TYPES.REBOOT]: 'Reboot Miner',
  [ACTION_TYPES.SET_POWER_MODE]: 'Set Power Mode',
  [ACTION_TYPES.SETUP_FREQUENCY_SPEED]: 'Set Frequency Settings',
  [ACTION_TYPES.SET_LED]: 'Set LED',
  [ACTION_TYPES.SETUP_POOLS]: 'Setup Pools',

  // Thing actions
  [ACTION_TYPES.REGISTER_THING]: 'Register Thing',
  [ACTION_TYPES.UPDATE_THING]: 'Update Thing',
  [ACTION_TYPES.FORGET_THINGS]: 'Remove Thing',

  // Rack actions
  [ACTION_TYPES.RACK_REBOOT]: `Reboot ${WEBAPP_NAME}`,
} as const

export const MINER_ACTIONS = [
  ACTION_TYPES.REBOOT,
  ACTION_TYPES.SET_POWER_MODE,
  ACTION_TYPES.SET_LED,
  ACTION_TYPES.SETUP_POOLS,
] as const

export const CONTAINER_ACTIONS = [
  ACTION_TYPES.SWITCH_CONTAINER,
  ACTION_TYPES.SWITCH_COOLING_SYSTEM,
  ACTION_TYPES.SET_TANK_ENABLED,
  ACTION_TYPES.SET_AIR_EXHAUST_ENABLED,
  ACTION_TYPES.RESET_COOLING_SYSTEM,
  ACTION_TYPES.SET_LIQUID_SUPPLY_TEMPERATURE,
  ACTION_TYPES.SET_TEMPERATURE_SETTINGS,
  ACTION_TYPES.SET_COOLING_FAN_THRESHOLD,
  ACTION_TYPES.SWITCH_SOCKET,
  ACTION_TYPES.RESET_ALARM,
  ACTION_TYPES.RESET_CONTAINER,
  ACTION_TYPES.EMERGENCY_STOP,
  ACTION_TYPES.MAINTENANCE,
] as const

export const THING_ACTIONS = [
  ACTION_TYPES.REGISTER_THING,
  ACTION_TYPES.UPDATE_THING,
  ACTION_TYPES.FORGET_THINGS,
] as const

export const ACTION_STATUS_TYPES = {
  COMPLETED: 'COMPLETED',
  DENIED: 'DENIED',
  VOTING: 'VOTING',
  APPROVED: 'APPROVED',
  EXECUTING: 'EXECUTING',
  FAILED: 'FAILED',
} as const

export const ActionErrorMessages = {
  ERR_WRITE_PERM_REQUIRED: 'Invalid permissions or no action found',
}

export const CONFIRMATION_ACTIONS = {
  submit: 'submit',
  submitAll: 'submit all',
  discard: 'discard',
  discardAll: 'discard all',
  reject: 'reject',
  approve: 'approve',
  cancel: 'cancel request',
  approveAll: 'approve all',
  rejectAll: 'reject all',
}

// Type exports
export type ActionTypeKey = keyof typeof ACTION_TYPES
export type ActionTypeValue = (typeof ACTION_TYPES)[ActionTypeKey]
export type BatchActionTypeKey = keyof typeof BATCH_ACTION_TYPES
export type BatchActionTypeValue = (typeof BATCH_ACTION_TYPES)[BatchActionTypeKey]
export type ActionNameKey = keyof typeof ACTION_NAMES_MAP
export type ActionNameValue = (typeof ACTION_NAMES_MAP)[ActionNameKey]
export type MinerActionValue = (typeof MINER_ACTIONS)[number]
export type ContainerActionValue = (typeof CONTAINER_ACTIONS)[number]
export type ThingActionValue = (typeof THING_ACTIONS)[number]
export type ActionStatusTypeKey = keyof typeof ACTION_STATUS_TYPES
export type ActionStatusTypeValue = (typeof ACTION_STATUS_TYPES)[ActionStatusTypeKey]
