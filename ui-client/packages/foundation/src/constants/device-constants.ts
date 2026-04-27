import { CHART_COLORS } from '@mdk/core'

export const MINER_MODEL = {
  AVALON: 'avalon',
  ANTMINER: 'antminer',
  WHATSMINER: 'whatsminer',
} as const

export const MINER_TYPE = {
  AVALON: 'av',
  ANTMINER: 'am',
  WHATSMINER: 'wm',
} as const

export const MINER_BRAND_NAMES = {
  [MINER_TYPE.AVALON]: 'Avalon',
  [MINER_TYPE.ANTMINER]: 'Antminer',
  [MINER_TYPE.WHATSMINER]: 'Whatsminer',
} as const

export const MinerStatuses = {
  MINING: 'mining',
  OFFLINE: 'offline',
  SLEEPING: 'sleeping',
  ERROR: 'error',
  NOT_MINING: 'not_mining',
  MAINTENANCE: 'maintenance',
  ALERT: 'alert',
} as const

export const COMPLETE_MINER_TYPES = {
  ANTMINER_AM_S21: 'miner-am-s21',
  WHATSMINER_WM_63: 'miner-wm-m63',
  WHATSMINER_WM_53: 'miner-wm-m53s',
  AVALON_AV_a1346: 'miner-av-a1346',
  WHATSMINER_WM_56: 'miner-wm-m56s',
  WHATSMINER_WM_30: 'miner-wm-m30sp',
  ANTMINER_AM_S19XP: 'miner-am-s19xp',
  ANTMINER_AM_S21PRO: 'miner-am-s21pro',
  WHATSMINER_WM_30SPP: 'miner-wm-m30spp',
  ANTMINER_AM_S19XP_H: 'miner-am-s19xp_h',
  ACME_M1: 'miner-acme-m1',
} as const

export const MINER_TYPES_COLOR_MAP = {
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP]: CHART_COLORS.red,
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30]: CHART_COLORS.blue,
  [COMPLETE_MINER_TYPES.AVALON_AV_a1346]: CHART_COLORS.green,
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21]: CHART_COLORS.purple,
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_63]: CHART_COLORS.VIOLET,
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21PRO]: CHART_COLORS.VIOLET,
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_56]: CHART_COLORS.SKY_BLUE,
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30SPP]: CHART_COLORS.orange,
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP_H]: CHART_COLORS.yellow,
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_53]: CHART_COLORS.METALLIC_BLUE,
} as const

export const MINER_TYPE_BAR_CHART_ITEM_STYLE_KEY_DEFAULT = 'YELLOW'

export const MINER_TYPES_BAR_CHART_ITEM_STYLE_KEY_MAP = {
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP]: 'RED',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30]: 'BLUE',
  [COMPLETE_MINER_TYPES.AVALON_AV_a1346]: 'GREEN',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21]: 'PURPLE',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_63]: 'VIOLET',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_56]: 'SKY_BLUE',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21PRO]: 'VIOLET',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP_H]: 'YELLOW',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30SPP]: 'ORANGE',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_53]: 'METALLIC_BLUE',
} as const

export const LV_CABINET_DEVICES_TYPE = {
  POWERMETER_ABB_B24: 'powermeter-abb-b24',
  SENSOR_TEMP_SENECA: 'sensor-temp-seneca',
  POWERMETER_ABB_M1M20: 'powermeter-abb-m1m20',
  POWERMETER_ABB_M4M20: 'powermeter-abb-m4m20',
  POWERMETER_SCHNEIDER_PM5340: 'powermeter-schneider-pm5340',
} as const

export const LV_CABINET_DEVICES_TAG = {
  POWERMETER: 't-powermeter',
  SENSOR_TEMP: 't-sensor-temp',
} as const

export const CABINET_DEVICES_TYPES_NAME_MAP = {
  [LV_CABINET_DEVICES_TYPE.POWERMETER_ABB_B24]: 'Powermeter ABB B24',
  [LV_CABINET_DEVICES_TYPE.SENSOR_TEMP_SENECA]: 'Sensor Temp Seneca',
  [LV_CABINET_DEVICES_TYPE.POWERMETER_ABB_M4M20]: 'Powermeter ABB M4M20',
  [LV_CABINET_DEVICES_TYPE.POWERMETER_ABB_M1M20]: 'Powermeter ABB M1M20',
  [LV_CABINET_DEVICES_TYPE.POWERMETER_SCHNEIDER_PM5340]: 'Powermeter Schneider PM5340',
} as const

export const MINER_TYPE_NAME_MAP = {
  [COMPLETE_MINER_TYPES.AVALON_AV_a1346]: 'Avalon A1346',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21]: 'Antminer S21',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_63]: 'Whatsminer M63',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_56]: 'Whatsminer M56S',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_53]: 'Whatsminer M53S',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP]: 'Antminer S19XP',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30]: 'Whatsminer M30SP',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21PRO]: 'Antminer S21pro',
  [COMPLETE_MINER_TYPES.ACME_M1]: 'Acme M1',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP_H]: 'Antminer S19XP H',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30SPP]: 'Whatsminer M30SPP',
} as const

export const ALERT_TYPE_POOL_VALUE = {
  IP_WORKER_NAME: 'ip_worker_name',
  WRONG_MINER_POOL: 'wrong_miner_pool',
  WRONG_WORKER_NAME: 'wrong_worker_name',
  WRONG_MINER_SUBACCOUNT: 'wrong_miner_subaccount',
} as const

export const ALERT_TYPE_POOL_NAME = {
  [ALERT_TYPE_POOL_VALUE.IP_WORKER_NAME]: 'IP worker name',
  [ALERT_TYPE_POOL_VALUE.WRONG_MINER_POOL]: 'Wrong miner pool',
  [ALERT_TYPE_POOL_VALUE.WRONG_WORKER_NAME]: 'Wrong worker name',
  [ALERT_TYPE_POOL_VALUE.WRONG_MINER_SUBACCOUNT]: 'Wrong miner subaccount',
} as const

export const CONTAINERS_MINER_TYPE = {
  M56: 'm56',
  M30: 'm30',
  A1346: 'a1346',
  S19XP: 's19xp',
} as const

export const MINER_MODEL_TO_TYPE_MAP = {
  [MINER_TYPE.AVALON]: MINER_MODEL.AVALON,
  [MINER_TYPE.ANTMINER]: MINER_MODEL.ANTMINER,
  [MINER_TYPE.WHATSMINER]: MINER_MODEL.WHATSMINER,
} as const

export const MINER_TYPE_MESSAGE = {
  [COMPLETE_MINER_TYPES.AVALON_AV_a1346]:
    'A1346 miners do not report consumption individually, so Avg. efficiency cannot be calculated',
  // Add more miner-specific messages here if needed
} as const

export const PM_ATTRIBUTE_LABEL_MAP = {
  'I1 a': 'Current L1',
  'I2 a': 'Current L2',
  'I3 a': 'Current L3',
  'V3 n v': 'Voltage L3-N',
  'V2 n v': 'Voltage L2-N',
  'V1 n v': 'Voltage L1-N',
  'In a': 'Current Neutral',
  'V2 v3 v': 'Voltage L2-L3',
  'V1 v2 v': 'Voltage L1-L2',
  'V3 v1 v': 'Voltage L3-L1',
} as const

// Type exports
export type MinerModelKey = keyof typeof MINER_MODEL
export type MinerTypeKey = keyof typeof MINER_TYPE
export type MinerBrandNameKey = keyof typeof MINER_BRAND_NAMES
export type MinerTypeValue = (typeof MINER_TYPE)[MinerTypeKey]
export type MinerModelValue = (typeof MINER_MODEL)[MinerModelKey]
export type MinerTypeMessageKey = keyof typeof MINER_TYPE_MESSAGE
export type MinerTypeNameMapKey = keyof typeof MINER_TYPE_NAME_MAP
export type CompleteMinerTypeKey = keyof typeof COMPLETE_MINER_TYPES
export type AlertTypePoolNameKey = keyof typeof ALERT_TYPE_POOL_NAME
export type MinerTypesColorMapKey = keyof typeof MINER_TYPES_COLOR_MAP
export type AlertTypePoolValueKey = keyof typeof ALERT_TYPE_POOL_VALUE
export type ContainersMinerTypeKey = keyof typeof CONTAINERS_MINER_TYPE
export type PmAttributeLabelMapKey = keyof typeof PM_ATTRIBUTE_LABEL_MAP
export type LvCabinetDevicesTagKey = keyof typeof LV_CABINET_DEVICES_TAG
export type CabinetDevicesTypesNameMapValue =
  (typeof CABINET_DEVICES_TYPES_NAME_MAP)[CabinetDevicesTypesNameMapKey]
export type MinerModelToTypeMapKey = keyof typeof MINER_MODEL_TO_TYPE_MAP
export type LvCabinetDevicesTypeKey = keyof typeof LV_CABINET_DEVICES_TYPE

export type MinerBrandNameValue = (typeof MINER_BRAND_NAMES)[MinerBrandNameKey]
export type MinerTypeMessageValue = (typeof MINER_TYPE_MESSAGE)[MinerTypeMessageKey]
export type MinerTypeNameMapValue = (typeof MINER_TYPE_NAME_MAP)[MinerTypeNameMapKey]
export type CabinetDevicesTypesNameMapKey = keyof typeof CABINET_DEVICES_TYPES_NAME_MAP
export type AlertTypePoolNameValue = (typeof ALERT_TYPE_POOL_NAME)[AlertTypePoolNameKey]
export type CompleteMinerTypeValue = (typeof COMPLETE_MINER_TYPES)[CompleteMinerTypeKey]
export type AlertTypePoolValueValue = (typeof ALERT_TYPE_POOL_VALUE)[AlertTypePoolValueKey]
export type MinerTypesColorMapValue = (typeof MINER_TYPES_COLOR_MAP)[MinerTypesColorMapKey]
export type ContainersMinerTypeValue = (typeof CONTAINERS_MINER_TYPE)[ContainersMinerTypeKey]
export type PmAttributeLabelMapValue = (typeof PM_ATTRIBUTE_LABEL_MAP)[PmAttributeLabelMapKey]
export type LvCabinetDevicesTagValue = (typeof LV_CABINET_DEVICES_TAG)[LvCabinetDevicesTagKey]
export type MinerModelToTypeMapValue = (typeof MINER_MODEL_TO_TYPE_MAP)[MinerModelToTypeMapKey]
export type LvCabinetDevicesTypeValue = (typeof LV_CABINET_DEVICES_TYPE)[LvCabinetDevicesTypeKey]
