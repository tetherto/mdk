/**
 * Device / miner / power-meter tag + type literals. These are data-layer
 * contracts shared between the API surface and the UI — owned by ui-foundation
 * so the React layers can stay free of tag strings.
 *
 * Lifted from `@tetherto/mdk-react-devkit` per the layering rule
 * documented in `docs/ARCHITECTURE.md` (separation-of-concerns).
 */

export const MINER_MODEL = {
  AVALON: 'avalon',
  ANTMINER: 'antminer',
  WHATSMINER: 'whatsminer',
} as const

/**
 * The two-letter codes identifying a miner brand in device tags and types.
 *
 * @category general
 */
export const MINER_TYPE = {
  AVALON: 'av',
  ANTMINER: 'am',
  WHATSMINER: 'wm',
} as const

/**
 * Display names for each miner brand code, for showing a brand in the UI.
 *
 * @category general
 */
export const MINER_BRAND_NAMES = {
  [MINER_TYPE.AVALON]: 'Avalon',
  [MINER_TYPE.ANTMINER]: 'Antminer',
  [MINER_TYPE.WHATSMINER]: 'Whatsminer',
} as const

/**
 * The states a miner reports, from mining through to error and maintenance.
 *
 * @category general
 */
export const MinerStatuses = {
  MINING: 'mining',
  OFFLINE: 'offline',
  SLEEPING: 'sleeping',
  ERROR: 'error',
  NOT_MINING: 'not_mining',
  MAINTENANCE: 'maintenance',
  ALERT: 'alert',
} as const

/**
 * Full device type identifiers for each supported miner model, as they appear
 * on a device.
 *
 * @category general
 */
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
  DEMO_M1: 'miner-demo-m1',
} as const

/**
 * Full device type identifiers for the power meters and temperature sensors
 * found in a low-voltage cabinet.
 *
 * @category general
 */
export const LV_CABINET_DEVICES_TYPE = {
  POWERMETER_ABB_B24: 'powermeter-abb-b24',
  SENSOR_TEMP_SENECA: 'sensor-temp-seneca',
  POWERMETER_ABB_M1M20: 'powermeter-abb-m1m20',
  POWERMETER_ABB_M4M20: 'powermeter-abb-m4m20',
  POWERMETER_SCHNEIDER_PM5340: 'powermeter-schneider-pm5340',
} as const

/**
 * The tags marking a device as a power meter or a temperature sensor.
 *
 * @category general
 */
export const LV_CABINET_DEVICES_TAG = {
  POWERMETER: 't-powermeter',
  SENSOR_TEMP: 't-sensor-temp',
} as const

/**
 * Display names for each low-voltage cabinet device type.
 *
 * @category general
 */
export const CABINET_DEVICES_TYPES_NAME_MAP = {
  [LV_CABINET_DEVICES_TYPE.POWERMETER_ABB_B24]: 'Powermeter ABB B24',
  [LV_CABINET_DEVICES_TYPE.SENSOR_TEMP_SENECA]: 'Sensor Temp Seneca',
  [LV_CABINET_DEVICES_TYPE.POWERMETER_ABB_M4M20]: 'Powermeter ABB M4M20',
  [LV_CABINET_DEVICES_TYPE.POWERMETER_ABB_M1M20]: 'Powermeter ABB M1M20',
  [LV_CABINET_DEVICES_TYPE.POWERMETER_SCHNEIDER_PM5340]: 'Powermeter Schneider PM5340',
} as const

/**
 * Display names for each supported miner model, such as `Antminer S21`.
 *
 * @category general
 */
export const MINER_TYPE_NAME_MAP = {
  [COMPLETE_MINER_TYPES.AVALON_AV_a1346]: 'Avalon A1346',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21]: 'Antminer S21',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_63]: 'Whatsminer M63',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_56]: 'Whatsminer M56S',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_53]: 'Whatsminer M53S',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP]: 'Antminer S19XP',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30]: 'Whatsminer M30SP',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S21PRO]: 'Antminer S21pro',
  [COMPLETE_MINER_TYPES.DEMO_M1]: 'Demo M1',
  [COMPLETE_MINER_TYPES.ANTMINER_AM_S19XP_H]: 'Antminer S19XP H',
  [COMPLETE_MINER_TYPES.WHATSMINER_WM_30SPP]: 'Whatsminer M30SPP',
} as const

/**
 * The pool misconfiguration conditions that can raise an alert, such as a miner
 * pointing at the wrong pool or reporting an unexpected worker name.
 *
 * @category general
 */
export const ALERT_TYPE_POOL_VALUE = {
  IP_WORKER_NAME: 'ip_worker_name',
  WRONG_MINER_POOL: 'wrong_miner_pool',
  WRONG_WORKER_NAME: 'wrong_worker_name',
  WRONG_MINER_SUBACCOUNT: 'wrong_miner_subaccount',
} as const

/**
 * Display names for each pool alert condition.
 *
 * @category general
 */
export const ALERT_TYPE_POOL_NAME = {
  [ALERT_TYPE_POOL_VALUE.IP_WORKER_NAME]: 'IP worker name',
  [ALERT_TYPE_POOL_VALUE.WRONG_MINER_POOL]: 'Wrong miner pool',
  [ALERT_TYPE_POOL_VALUE.WRONG_WORKER_NAME]: 'Wrong worker name',
  [ALERT_TYPE_POOL_VALUE.WRONG_MINER_SUBACCOUNT]: 'Wrong miner subaccount',
} as const

/**
 * Short miner model codes used when describing what a container holds.
 *
 * @category general
 */
export const CONTAINERS_MINER_TYPE = {
  M56: 'm56',
  M30: 'm30',
  A1346: 'a1346',
  S19XP: 's19xp',
} as const

/**
 * Maps a two-letter miner type code to its brand key, so `am` becomes `antminer`. For the
 * display name of a specific model, use `MINER_TYPE_NAME_MAP`.
 *
 * @category general
 */
export const MINER_MODEL_TO_TYPE_MAP = {
  [MINER_TYPE.AVALON]: MINER_MODEL.AVALON,
  [MINER_TYPE.ANTMINER]: MINER_MODEL.ANTMINER,
  [MINER_TYPE.WHATSMINER]: MINER_MODEL.WHATSMINER,
} as const

/**
 * Caveats to show alongside a miner model, where the hardware limits what can be
 * reported. The A1346 entry explains why its average efficiency is unavailable.
 *
 * @category general
 */
export const MINER_TYPE_MESSAGE = {
  [COMPLETE_MINER_TYPES.AVALON_AV_a1346]:
    'A1346 miners do not report consumption individually, so Avg. efficiency cannot be calculated',
} as const

/**
 * Display labels for the raw power meter reading names, turning `I1 a` into
 * `Current L1`.
 *
 * @category general
 */
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

export type MinerModelKey = keyof typeof MINER_MODEL
export type MinerTypeKey = keyof typeof MINER_TYPE
export type MinerBrandNameKey = keyof typeof MINER_BRAND_NAMES
export type MinerTypeValue = (typeof MINER_TYPE)[MinerTypeKey]
export type MinerModelValue = (typeof MINER_MODEL)[MinerModelKey]
export type MinerTypeMessageKey = keyof typeof MINER_TYPE_MESSAGE
export type MinerTypeNameMapKey = keyof typeof MINER_TYPE_NAME_MAP
export type CompleteMinerTypeKey = keyof typeof COMPLETE_MINER_TYPES
export type AlertTypePoolNameKey = keyof typeof ALERT_TYPE_POOL_NAME
export type AlertTypePoolValueKey = keyof typeof ALERT_TYPE_POOL_VALUE
export type ContainersMinerTypeKey = keyof typeof CONTAINERS_MINER_TYPE
export type PmAttributeLabelMapKey = keyof typeof PM_ATTRIBUTE_LABEL_MAP
export type LvCabinetDevicesTagKey = keyof typeof LV_CABINET_DEVICES_TAG
export type CabinetDevicesTypesNameMapKey = keyof typeof CABINET_DEVICES_TYPES_NAME_MAP
export type CabinetDevicesTypesNameMapValue =
  (typeof CABINET_DEVICES_TYPES_NAME_MAP)[CabinetDevicesTypesNameMapKey]
export type MinerModelToTypeMapKey = keyof typeof MINER_MODEL_TO_TYPE_MAP
export type LvCabinetDevicesTypeKey = keyof typeof LV_CABINET_DEVICES_TYPE
export type MinerBrandNameValue = (typeof MINER_BRAND_NAMES)[MinerBrandNameKey]
export type MinerTypeMessageValue = (typeof MINER_TYPE_MESSAGE)[MinerTypeMessageKey]
export type MinerTypeNameMapValue = (typeof MINER_TYPE_NAME_MAP)[MinerTypeNameMapKey]
export type AlertTypePoolNameValue = (typeof ALERT_TYPE_POOL_NAME)[AlertTypePoolNameKey]
export type CompleteMinerTypeValue = (typeof COMPLETE_MINER_TYPES)[CompleteMinerTypeKey]
export type AlertTypePoolValueValue = (typeof ALERT_TYPE_POOL_VALUE)[AlertTypePoolValueKey]
export type ContainersMinerTypeValue = (typeof CONTAINERS_MINER_TYPE)[ContainersMinerTypeKey]
export type PmAttributeLabelMapValue = (typeof PM_ATTRIBUTE_LABEL_MAP)[PmAttributeLabelMapKey]
export type LvCabinetDevicesTagValue = (typeof LV_CABINET_DEVICES_TAG)[LvCabinetDevicesTagKey]
export type MinerModelToTypeMapValue = (typeof MINER_MODEL_TO_TYPE_MAP)[MinerModelToTypeMapKey]
export type LvCabinetDevicesTypeValue = (typeof LV_CABINET_DEVICES_TYPE)[LvCabinetDevicesTypeKey]
