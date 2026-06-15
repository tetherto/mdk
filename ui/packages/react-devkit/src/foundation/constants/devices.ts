export const CROSS_THING_TYPES = {
  POOL: 'pool',
  MINER: 'miner',
  CABINET: 'cabinet',
  CONTAINER: 'container',
} as const

export const DEVICE_STATUS = {
  RUNNING: 'Running',
  OFF: 'Off',
  ERROR: 'Error',
  UNAVAILABLE: 'Unavailable',
} as const

// Type exports
export type CrossThingTypeKey = keyof typeof CROSS_THING_TYPES
export type CrossThingTypeValue = (typeof CROSS_THING_TYPES)[CrossThingTypeKey]
export type DeviceStatus = (typeof DEVICE_STATUS)[keyof typeof DEVICE_STATUS]
