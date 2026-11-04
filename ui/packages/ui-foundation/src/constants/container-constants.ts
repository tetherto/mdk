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

/**
 * The container families that have their own settings screens: Bitdeer, MicroBT,
 * hydro, and immersion.
 *
 * @category general
 */
export const CONTAINER_SETTINGS_MODEL = {
  BITDEER: 'bd',
  MICROBT: 'mbt',
  HYDRO: 'hydro',
  IMMERSION: 'immersion',
}

/**
 * Short codes identifying a container family in device tags and types.
 *
 * @category general
 */
export const CONTAINER_TYPE = {
  BITDEER: 'bd',
  ANTSPACE: 'as',
  MICROBT: 'mbt',
  ANTSPACE_HYDRO: 'as-hk3',
  ANTSPACE_IMMERSION: 'as-immersion',
} as const

/**
 * Full device type identifiers for each supported container model, as they appear
 * on a device.
 *
 * @category general
 */
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

/**
 * Display names for each supported container model, such as `Bitdeer M30`.
 *
 * @category general
 */
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

/**
 * What a container optimises for when curtailing: coin price, electricity price,
 * or disabled.
 *
 * @category general
 */
export const CONTAINER_TACTICS_TYPE = {
  COIN: 'coin',
  DISABLED: 'disabled',
  ELECTRICITY: 'electricity',
} as const

/**
 * The `info.container` value of a device moved into the maintenance pseudo-container.
 * The backend does not poll a device in maintenance, recording it as offline instead, and
 * the UI groups it under "Maintenance".
 *
 * @category general
 */
export const MAINTENANCE_CONTAINER = 'maintenance'

/**
 * The `info.container` value marking a device as not in maintenance, so it is polled
 * normally.
 *
 * @category general
 */
export const NO_MAINTENANCE_CONTAINER = 'no_maintenance'

/**
 * The cooling measurements a container can hold thresholds against: tank pressure,
 * oil and water temperature, and supply liquid pressure.
 *
 * @category general
 */
export const THRESHOLD_TYPE = {
  TANK_PRESSURE: 'tankPressure',
  OIL_TEMPERATURE: 'oilTemperature',
  WATER_TEMPERATURE: 'waterTemperature',
  SUPPLY_LIQUID_PRESSURE: 'supplyLiquidPressure',
} as const

/**
 * The severity bands a measurement can fall into, from normal through alert and
 * alarm to the critical high and low limits.
 *
 * @category general
 */
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
