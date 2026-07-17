/**
 * Re-export of the container tag/type/threshold literals that now live in
 * `@tetherto/mdk-ui-foundation` (per the separation-of-concerns rule —
 * data-layer contracts belong in ui-foundation, not the React layer).
 *
 * Kept here so existing imports under `foundation/constants/container-constants`
 * continue to resolve. New code should import directly from
 * `@tetherto/mdk-ui-foundation`.
 */

export {
  COMPLETE_CONTAINER_TYPE,
  CONTAINER_MODEL,
  CONTAINER_SETTINGS_MODEL,
  CONTAINER_TAB,
  CONTAINER_TACTICS_TYPE,
  CONTAINER_TYPE,
  CONTAINER_TYPE_NAME_MAP,
  MAINTENANCE_CONTAINER,
  NO_MAINTENANCE_CONTAINER,
  THRESHOLD_LEVEL,
  THRESHOLD_TYPE,
} from '@tetherto/mdk-ui-foundation'

export type {
  CompleteContainerTypeKey,
  CompleteContainerTypeValue,
  ContainerModelKey,
  ContainerModelValue,
  ContainerTabKey,
  ContainerTabValue,
  ContainerTacticsTypeKey,
  ContainerTacticsTypeValue,
  ContainerTypeKey,
  ContainerTypeNameKey,
  ContainerTypeNameValue,
  ContainerTypeValue,
  ThresholdLevelKey,
  ThresholdLevelValue,
  ThresholdTypeKey,
  ThresholdTypeValue,
} from '@tetherto/mdk-ui-foundation'
