/**
 * Container tag / type / threshold literals. Data-layer contracts shared
 * across the toolkit — owned by ui-foundation so the React layers stay free of
 * tag strings.
 *
 * Lifted from `@tetherto/mdk-react-devkit` per the layering rule
 * documented in `docs/ARCHITECTURE.md` (separation-of-concerns).
 */

export const CONTAINER_MODEL = {
  M221: 'm221',
  GAMMA: 'gamma',
  BITDEER: 'bitdeer',
  BITMAIN: 'bitmain',
  MICROBT: 'microbt',
  ANTSPACE: 'antspace',
  BITMAIN_IMM: 'bitmain-imm',
  BITMAIN_HYDRO: 'bitmain-hydro',
  ANTSPACE_HYDRO: 'antspace-hydro',
  BITDEER_THRESHOLD: 'bitdeer',
  MICROBT_THRESHOLD: 'microbt',
  HYDRO_THRESHOLD: 'hydro',
  IMMERSION_THRESHOLD: 'immersion',
  BITMAIN_IMMERSION: 'bitmain-immersion',
  ANTSPACE_IMMERSION: 'antspace-immersion',
  IMMERSION_CONTAINER: 'container-as-immersion',
} as const

export const CONTAINER_SETTINGS_MODEL = {
  BITDEER: 'bd',
  MICROBT: 'mbt',
  HYDRO: 'hydro',
  IMMERSION: 'immersion',
}

export const CONTAINER_TYPE = {
  BITDEER: 'bd',
  ANTSPACE: 'as',
  MICROBT: 'mbt',
  ANTSPACE_HYDRO: 'as-hk3',
  ANTSPACE_IMMERSION: 'as-immersion',
} as const

export const COMPLETE_CONTAINER_TYPE = {
  BITMAIN_HYDRO: 'container-as-hk3',
  BITDEER_M30: 'container-bd-d40-m30',
  BITDEER_M56: 'container-bd-d40-m56',
  MICROBT_ALPHA: 'container-mbt-alpha',
  BITDEER_S19XP: 'container-bd-d40-s19xp',
  BITDEER_A1346: 'container-bd-d40-a1346',
  M221_GAMMA: 'container-m221-gamma',
  BITMAIN_IMMERSION: 'container-as-immersion',
  MICROBT_BETA: 'container-mbt-beta',
} as const

export const CONTAINER_TYPE_NAME_MAP = {
  [COMPLETE_CONTAINER_TYPE.BITDEER_M30]: 'Bitdeer M30',
  [COMPLETE_CONTAINER_TYPE.BITDEER_M56]: 'Bitdeer M56',
  [COMPLETE_CONTAINER_TYPE.BITDEER_S19XP]: 'Bitdeer S19XP',
  [COMPLETE_CONTAINER_TYPE.BITMAIN_HYDRO]: 'Bitmain Hydro',
  [COMPLETE_CONTAINER_TYPE.MICROBT_ALPHA]: 'MicroBT Alpha',
  [COMPLETE_CONTAINER_TYPE.BITDEER_A1346]: 'Bitdeer A1346',
  [COMPLETE_CONTAINER_TYPE.BITMAIN_IMMERSION]: 'Bitmain Imm',
  [COMPLETE_CONTAINER_TYPE.MICROBT_BETA]: 'MicroBT Beta',
} as const

export const CONTAINER_TACTICS_TYPE = {
  COIN: 'coin',
  DISABLED: 'disabled',
  ELECTRICITY: 'electricity',
} as const

export const MAINTENANCE_CONTAINER = 'maintenance'

export const NO_MAINTENANCE_CONTAINER = 'no_maintenance'

export const THRESHOLD_TYPE = {
  TANK_PRESSURE: 'tankPressure',
  OIL_TEMPERATURE: 'oilTemperature',
  WATER_TEMPERATURE: 'waterTemperature',
  SUPPLY_LIQUID_PRESSURE: 'supplyLiquidPressure',
} as const

export const THRESHOLD_LEVEL = {
  ALERT: 'alert',
  ALARM: 'alarm',
  NORMAL: 'normal',
  ALARM_LOW: 'alarmLow',
  ALARM_HIGH: 'alarmHigh',
  CRITICAL_LOW: 'criticalLow',
  CRITICAL_HIGH: 'criticalHigh',
} as const

/**
 * Container detail-view tab keys. The per-model availability matrix lives in
 * `utils/container-tabs.ts`.
 */
export const CONTAINER_TAB = {
  PDU: 'pdu',
  HOME: 'home',
  ALARM: 'alarm',
  CHARTS: 'charts',
  HEATMAP: 'heatmap',
  CONTROLS: 'controls',
  SETTINGS: 'settings',
  PARAMETERS: 'parameters',
  POWER_ADJUSTMENT: 'power-adjustment',
} as const

/**
 * Display labels for the container detail tabs, mirroring the reference app's
 * `containerTabsHelper` (`PDU` renders as "PDU Layout", the rest are
 * capitalised keys).
 */
export const CONTAINER_TAB_LABEL = {
  [CONTAINER_TAB.PDU]: 'PDU Layout',
  [CONTAINER_TAB.HOME]: 'Home',
  [CONTAINER_TAB.ALARM]: 'Alarm',
  [CONTAINER_TAB.CHARTS]: 'Charts',
  [CONTAINER_TAB.HEATMAP]: 'Heatmap',
  [CONTAINER_TAB.CONTROLS]: 'Controls',
  [CONTAINER_TAB.SETTINGS]: 'Settings',
  [CONTAINER_TAB.PARAMETERS]: 'Parameters',
  [CONTAINER_TAB.POWER_ADJUSTMENT]: 'Power Adjustment',
} as const

export type ContainerTabKey = keyof typeof CONTAINER_TAB
export type ContainerTypeKey = keyof typeof CONTAINER_TYPE
export type ThresholdTypeKey = keyof typeof THRESHOLD_TYPE
export type ThresholdLevelKey = keyof typeof THRESHOLD_LEVEL
export type ContainerModelKey = keyof typeof CONTAINER_MODEL
export type ContainerTypeNameKey = keyof typeof CONTAINER_TYPE_NAME_MAP
export type ContainerTacticsTypeKey = keyof typeof CONTAINER_TACTICS_TYPE
export type CompleteContainerTypeKey = keyof typeof COMPLETE_CONTAINER_TYPE
export type ContainerTabValue = (typeof CONTAINER_TAB)[ContainerTabKey]
export type ContainerTypeValue = (typeof CONTAINER_TYPE)[ContainerTypeKey]
export type ThresholdTypeValue = (typeof THRESHOLD_TYPE)[ThresholdTypeKey]
export type ContainerModelValue = (typeof CONTAINER_MODEL)[ContainerModelKey]
export type ThresholdLevelValue = (typeof THRESHOLD_LEVEL)[ThresholdLevelKey]
export type ContainerTypeNameValue = (typeof CONTAINER_TYPE_NAME_MAP)[ContainerTypeNameKey]
export type ContainerTacticsTypeValue = (typeof CONTAINER_TACTICS_TYPE)[ContainerTacticsTypeKey]
export type CompleteContainerTypeValue = (typeof COMPLETE_CONTAINER_TYPE)[CompleteContainerTypeKey]
