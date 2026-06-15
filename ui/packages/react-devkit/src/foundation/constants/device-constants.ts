/**
 * Re-export of the device tag/type literals that now live in
 * `@tetherto/mdk-ui-core` (per the separation-of-concerns rule —
 * data-layer contracts belong in ui-core, not the React layer).
 *
 * Kept here so existing imports under `foundation/constants/device-constants`
 * continue to resolve. New code should import directly from
 * `@tetherto/mdk-ui-core`.
 */

export {
  ALERT_TYPE_POOL_NAME,
  ALERT_TYPE_POOL_VALUE,
  CABINET_DEVICES_TYPES_NAME_MAP,
  COMPLETE_MINER_TYPES,
  CONTAINERS_MINER_TYPE,
  LV_CABINET_DEVICES_TAG,
  LV_CABINET_DEVICES_TYPE,
  MINER_BRAND_NAMES,
  MINER_MODEL,
  MINER_MODEL_TO_TYPE_MAP,
  MINER_TYPE,
  MINER_TYPE_MESSAGE,
  MINER_TYPE_NAME_MAP,
  MinerStatuses,
  PM_ATTRIBUTE_LABEL_MAP,
} from '@tetherto/mdk-ui-core'

export type {
  AlertTypePoolNameKey,
  AlertTypePoolNameValue,
  AlertTypePoolValueKey,
  AlertTypePoolValueValue,
  CabinetDevicesTypesNameMapKey,
  CabinetDevicesTypesNameMapValue,
  CompleteMinerTypeKey,
  CompleteMinerTypeValue,
  ContainersMinerTypeKey,
  ContainersMinerTypeValue,
  LvCabinetDevicesTagKey,
  LvCabinetDevicesTagValue,
  LvCabinetDevicesTypeKey,
  LvCabinetDevicesTypeValue,
  MinerBrandNameKey,
  MinerBrandNameValue,
  MinerModelKey,
  MinerModelToTypeMapKey,
  MinerModelToTypeMapValue,
  MinerModelValue,
  MinerTypeKey,
  MinerTypeMessageKey,
  MinerTypeMessageValue,
  MinerTypeNameMapKey,
  MinerTypeNameMapValue,
  MinerTypeValue,
  PmAttributeLabelMapKey,
  PmAttributeLabelMapValue,
} from '@tetherto/mdk-ui-core'
